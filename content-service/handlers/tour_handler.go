package handlers

import (
    "context"
    "net/http"
    "strconv"
    "time"
    "errors"
    "content-service/models"
    "github.com/gin-gonic/gin"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "io"
    "encoding/json"
)

type TourHandler struct {
    DB *mongo.Database
}

func NewTourHandler(db *mongo.Database) *TourHandler {
    return &TourHandler{DB: db}
}

// GET /tours - get all tours with optional filtering
func (h *TourHandler) GetTours(c *gin.Context) {
    // Get query parameters
    authorIDStr := c.Query("author_id")
    status := c.Query("status")
    
    collection := h.DB.Collection("tours")
    filter := bson.M{}
    
    // Filter by author if specified
    if authorIDStr != "" {
        authorID, err := strconv.Atoi(authorIDStr)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid author ID"})
            return
        }
        filter["author_id"] = authorID
    }
    
    // Filter by status if specified
    if status != "" {
        filter["status"] = status
    } else {
        // Default: only show published tours for general browsing
        userIDStr := c.GetHeader("X-User-ID")
        if userIDStr == "" {
            filter["status"] = "published"
        }
    }

    cursor, err := collection.Find(context.TODO(), filter)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    defer cursor.Close(context.TODO())

    var tours []models.Tour
    if err = cursor.All(context.TODO(), &tours); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode tours"})
        return
    }

    // For published tours, check purchase status and limit keypoints
    userIDStr := c.GetHeader("X-User-ID")
    if userIDStr != "" {
        userID, err := strconv.Atoi(userIDStr)
        if err == nil {
            for i, tour := range tours {
                if tour.Status == "published" {
                    hasPurchased := h.checkTourPurchase(userID, tour.ID.Hex())
                    if !hasPurchased && len(tour.Keypoints) > 0 {
                        tours[i].Keypoints = tour.Keypoints[:1] // Only first keypoint
                    }
                }
            }
        }
    } else {
        // No user ID, show only first keypoint for published tours
        for i, tour := range tours {
            if tour.Status == "published" && len(tour.Keypoints) > 0 {
                tours[i].Keypoints = tour.Keypoints[:1]
            }
        }
    }

    c.JSON(http.StatusOK, gin.H{"tours": tours})
}

func (h *TourHandler) checkTourPurchase(userID int, tourID string) bool {
    // Call commerce service to check purchase
    commerceURL := "http://commerce-service:8083/purchase/check/" + tourID
    
    client := &http.Client{Timeout: time.Second * 10}
    req, err := http.NewRequest("GET", commerceURL, nil)
    if err != nil {
        return false
    }
    
    req.Header.Set("X-User-ID", strconv.Itoa(userID))
    
    resp, err := client.Do(req)
    if err != nil {
        return false
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return false
    }
    
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return false
    }
    
    var purchaseInfo struct {
        IsPurchased bool `json:"is_purchased"`
    }
    
    if err := json.Unmarshal(body, &purchaseInfo); err != nil {
        return false
    }
    
    return purchaseInfo.IsPurchased
}

// GET /tours/:id - get tour by ID
func (h *TourHandler) GetTourByID(c *gin.Context) {
    idStr := c.Param("id")
    userIDStr := c.GetHeader("X-User-ID")
    
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    var tour models.Tour
    collection := h.DB.Collection("tours")
    err = collection.FindOne(context.TODO(), bson.M{"_id": objectID}).Decode(&tour)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    // Only limit keypoints for non-authors on published tours
    if userIDStr != "" {
        userID, _ := strconv.Atoi(userIDStr)
        
        // If user is the author, always show all keypoints
        if tour.AuthorID == userID {
            c.JSON(http.StatusOK, gin.H{"tour": tour})
            return
        }
        
        // For published tours, check if user has purchased
        if tour.Status == "published" {
            hasPurchased := false  // Check purchase status here
            
            if !hasPurchased && len(tour.Keypoints) > 0 {
                tour.Keypoints = tour.Keypoints[:1]
            }
        }
    } else if tour.Status == "published" {
        // No user ID provided, assume not purchased - show only first keypoint
        if len(tour.Keypoints) > 0 {
            tour.Keypoints = tour.Keypoints[:1]
        }
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

func (h *TourHandler) validateTourForPublishing(tour *models.Tour) error {
    // 1. Prover osnovne podatke
    if tour.Name == "" || tour.Description == "" || tour.Difficulty == "" || len(tour.Tags) == 0 {
        return errors.New("missing basic tour information (name, description, difficulty, tags)")
    }

    // 2. Proveri minimum 2 ključne tačke
    if len(tour.Keypoints) < 2 {
        return errors.New("tour must have at least 2 keypoints")
    }

    // 3. Proveri da li postoji bar jedno vreme transport-a
    if len(tour.TransportTimes) == 0 {
        return errors.New("tour must have at least one transport time defined")
    }

    // Validacija transport types
    validTransports := map[string]bool{
        "walking":  true,
        "bicycle":  true,
        "car":      true,
    }

    hasValidTransport := false
    for _, tt := range tour.TransportTimes {
        if !validTransports[tt.TransportType] {
            return errors.New("invalid transport type: " + tt.TransportType)
        }
        if tt.DurationMinutes <= 0 {
            return errors.New("transport duration must be positive")
        }
        hasValidTransport = true
    }

    if !hasValidTransport {
        return errors.New("no valid transport times defined")
    }

    return nil
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

    // ✅ VALIDACIJA ZA PUBLIKOVANJE (Funkcionalnost 15)
    if req.Status == "published" && tour.Status != "published" {
        // Proveri da li tura može da se objavi
        if err := h.validateTourForPublishing(&tour); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "error": "Cannot publish tour: " + err.Error(),
                "details": "Tour must have basic info, at least 2 keypoints, and transport times",
            })
            return
        }
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
    if req.Price > 0 {
        updateDoc["price"] = req.Price
    }
    if req.DistanceKm >= 0 {
        updateDoc["distance_km"] = req.DistanceKm
    }
    if req.Tags != nil {
        updateDoc["tags"] = req.Tags
    }
    
    // ✅ STATUS HANDLING SA TIMESTAMP-OVIMA
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
        
        // Ako se vraća iz archived u published, ukloni archived_at
        if req.Status == "published" && tour.Status == "archived" {
            updateDoc["archived_at"] = nil
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

    c.JSON(http.StatusOK, gin.H{
        "message": "Tour updated successfully",
        "status": req.Status,
    })
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

func (h *TourHandler) ClearAllKeypoints(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
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
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only modify your own tours"})
        return
    }

    // Clear all keypoints
    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{
            "$set": bson.M{
                "keypoints": []models.Keypoint{},
                "distance_km": 0.0,
                "updated_at": time.Now(),
            },
        },
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear keypoints"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "All keypoints cleared successfully"})
}

// POST /tours/:id/transport-times - add transport time
func (h *TourHandler) AddTransportTime(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    var req struct {
        TransportType   string `json:"transport_type" binding:"required,oneof=walking bicycle car"`
        DurationMinutes int    `json:"duration_minutes" binding:"required,min=1"`
    }
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
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only modify your own tours"})
        return
    }

    // Create the new transport time
    transportTime := models.TransportTime{
        TransportType:   req.TransportType,
        DurationMinutes: req.DurationMinutes,
    }

    // ✅ FIX 1: Initialize transport_times field if it doesn't exist
    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{
            "$setOnInsert": bson.M{"transport_times": []models.TransportTime{}},
        },
        options.Update().SetUpsert(false),
    )

    // ✅ FIX 2: Use $set instead of separate $pull and $push operations
    // This approach removes any existing transport time of the same type and adds the new one
    pipeline := []bson.M{
        {
            "$set": bson.M{
                "transport_times": bson.M{
                    "$concatArrays": []interface{}{
                        // Filter out existing transport times of the same type
                        bson.M{
                            "$filter": bson.M{
                                "input": bson.M{
                                    "$ifNull": []interface{}{"$transport_times", []interface{}{}},
                                },
                                "cond": bson.M{
                                    "$ne": []interface{}{"$$this.transport_type", req.TransportType},
                                },
                            },
                        },
                        // Add the new transport time
                        []models.TransportTime{transportTime},
                    },
                },
                "updated_at": time.Now(),
            },
        },
    }

    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        pipeline,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add transport time"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "Transport time added successfully",
        "transport_time": transportTime,
    })
}

// DELETE /tours/:id/transport-times/:type - remove transport time
func (h *TourHandler) RemoveTransportTime(c *gin.Context) {
    userID := getUserID(c)
    idStr := c.Param("id")
    transportType := c.Param("type")
    
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
        return
    }

    // Validate transport type
    validTypes := map[string]bool{"walking": true, "bicycle": true, "car": true}
    if !validTypes[transportType] {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transport type"})
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
        c.JSON(http.StatusForbidden, gin.H{"error": "You can only modify your own tours"})
        return
    }

    // Remove transport time
    _, err = collection.UpdateOne(
        context.TODO(),
        bson.M{"_id": objectID},
        bson.M{
            "$pull": bson.M{"transport_times": bson.M{"transport_type": transportType}},
            "$set": bson.M{"updated_at": time.Now()},
        },
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove transport time"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Transport time removed successfully"})
}