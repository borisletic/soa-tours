package handlers

import (
    "context"
    "net/http"
    "strconv"
    "time"

    "content-service/models"
    "github.com/gin-gonic/gin"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
)

type TourHandler struct {
    DB *mongo.Database
}

func NewTourHandler(db *mongo.Database) *TourHandler {
    return &TourHandler{DB: db}
}

// GET /tours - get all tours with optional filtering
func (h *TourHandler) GetTours(c *gin.Context) {
    collection := h.DB.Collection("tours")
    
    // Build filter
    filter := bson.M{}
    
    // Filter by author if specified
    if authorID := c.Query("author_id"); authorID != "" {
        if id, err := strconv.Atoi(authorID); err == nil {
            filter["author_id"] = id
        }
    }
    
    // Filter by status if specified
    if status := c.Query("status"); status != "" {
        filter["status"] = status
    }
    
    // Filter by difficulty if specified
    if difficulty := c.Query("difficulty"); difficulty != "" {
        filter["difficulty"] = difficulty
    }

    cursor, err := collection.Find(context.TODO(), filter)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tours"})
        return
    }
    defer cursor.Close(context.TODO())

    var tours []models.Tour
    if err = cursor.All(context.TODO(), &tours); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tours"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "tours": tours,
        "count": len(tours),
    })
}

// GET /tours/:id - get tour by ID
func (h *TourHandler) GetTourByID(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    collection := h.DB.Collection("tours")
    var tour models.Tour
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"tour": tour})
}

// POST /tours - create new tour
func (h *TourHandler) CreateTour(c *gin.Context) {
    userID := getUserID(c)
    
    var req models.CreateTourRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Create tour with default values
    tour := models.Tour{
        Name:        req.Name,
        Description: req.Description,
        AuthorID:    userID,
        Status:      "draft",      // Default status
        Difficulty:  req.Difficulty,
        Price:       0.0,          // Default price
        DistanceKm:  0.0,
        Tags:        req.Tags,
        Keypoints:   []models.Keypoint{},
        Reviews:     []models.Review{},
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    collection := h.DB.Collection("tours")
    result, err := collection.InsertOne(context.TODO(), tour)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tour"})
        return
    }

    tour.ID = result.InsertedID.(primitive.ObjectID)
    c.JSON(http.StatusCreated, gin.H{
        "message": "Tour created successfully",
        "tour": tour,
    })
}

// PUT /tours/:id - update tour
func (h *TourHandler) UpdateTour(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    var req models.UpdateTourRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    collection := h.DB.Collection("tours")
    
    // Check if tour exists and user is author
    var tour models.Tour
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if tour.AuthorID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own tours"})
        return
    }

    // Build update document
    updateDoc := bson.M{
        "updated_at": time.Now(),
    }

    if req.Name != "" {
        updateDoc["name"] = req.Name
    }
    if req.Description != "" {
        updateDoc["description"] = req.Description
    }
    if req.Difficulty != "" {
        updateDoc["difficulty"] = req.Difficulty
    }
    if req.Price >= 0 {
        updateDoc["price"] = req.Price
    }
    if req.DistanceKm >= 0 {
        updateDoc["distance_km"] = req.DistanceKm
    }
    if req.Tags != nil {
        updateDoc["tags"] = req.Tags
    }
    if req.Status != "" {
        updateDoc["status"] = req.Status
        if req.Status == "published" && tour.PublishedAt == nil {
            now := time.Now()
            updateDoc["published_at"] = now
        }
        if req.Status == "archived" && tour.ArchivedAt == nil {
            now := time.Now()
            updateDoc["archived_at"] = now
        }
    }

    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{"$set": updateDoc},
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tour"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Tour updated successfully"})
}

// POST /tours/:id/keypoints - add keypoint to tour
func (h *TourHandler) AddKeypoint(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    var req models.AddKeypointRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    collection := h.DB.Collection("tours")
    
    // Check if tour exists and user is author
    var tour models.Tour
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if tour.AuthorID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only add keypoints to your own tours"})
        return
    }

    // Create keypoint with next order number
    keypoint := models.Keypoint{
        Name:        req.Name,
        Description: req.Description,
        Latitude:    req.Latitude,
        Longitude:   req.Longitude,
        Images:      req.Images,
        Order:       len(tour.Keypoints), // Next order number
    }

    // Add keypoint to tour
    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{
            "$push": bson.M{"keypoints": keypoint},
            "$set": bson.M{"updated_at": time.Now()},
        },
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add keypoint"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "Keypoint added successfully",
        "keypoint": keypoint,
    })
}

// PUT /tours/:id/keypoints/:order - update keypoint
func (h *TourHandler) UpdateKeypoint(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    orderStr := c.Param("order")
    
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }
    
    order, err := strconv.Atoi(orderStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid keypoint order"})
        return
    }

    var req models.UpdateKeypointRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    collection := h.DB.Collection("tours")
    
    // Check if tour exists and user is author
    var tour models.Tour
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if tour.AuthorID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only update keypoints on your own tours"})
        return
    }

    if order >= len(tour.Keypoints) {
        c.JSON(http.StatusNotFound, gin.H{"error": "Keypoint not found"})
        return
    }

    // Build update for specific keypoint
    updateDoc := bson.M{}
    if req.Name != "" {
        updateDoc["keypoints."+strconv.Itoa(order)+".name"] = req.Name
    }
    if req.Description != "" {
        updateDoc["keypoints."+strconv.Itoa(order)+".description"] = req.Description
    }
    if req.Latitude != 0 {
        updateDoc["keypoints."+strconv.Itoa(order)+".latitude"] = req.Latitude
    }
    if req.Longitude != 0 {
        updateDoc["keypoints."+strconv.Itoa(order)+".longitude"] = req.Longitude
    }
    if req.Images != nil {
        updateDoc["keypoints."+strconv.Itoa(order)+".images"] = req.Images
    }
    if req.Order >= 0 {
        updateDoc["keypoints."+strconv.Itoa(order)+".order"] = req.Order
    }
    updateDoc["updated_at"] = time.Now()

    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{"$set": updateDoc},
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update keypoint"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Keypoint updated successfully"})
}

// DELETE /tours/:id/keypoints/:order - remove keypoint
func (h *TourHandler) RemoveKeypoint(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    orderStr := c.Param("order")
    
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }
    
    order, err := strconv.Atoi(orderStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid keypoint order"})
        return
    }

    collection := h.DB.Collection("tours")
    
    // Check if tour exists and user is author
    var tour models.Tour
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if tour.AuthorID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only remove keypoints from your own tours"})
        return
    }

    if order >= len(tour.Keypoints) {
        c.JSON(http.StatusNotFound, gin.H{"error": "Keypoint not found"})
        return
    }

    // Remove keypoint and reorder remaining ones
    newKeypoints := make([]models.Keypoint, 0, len(tour.Keypoints)-1)
    for i, kp := range tour.Keypoints {
        if i != order {
            if i > order {
                kp.Order = i - 1 // Reorder
            }
            newKeypoints = append(newKeypoints, kp)
        }
    }

    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{
            "$set": bson.M{
                "keypoints": newKeypoints,
                "updated_at": time.Now(),
            },
        },
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove keypoint"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Keypoint removed successfully"})
}

// Helper function to get user ID from context
func getUserID(c *gin.Context) int {
    if userIDStr := c.GetHeader("X-User-ID"); userIDStr != "" {
        if id, err := strconv.Atoi(userIDStr); err == nil {
            return id
        }
    }
    return 1 // Default mock user
}