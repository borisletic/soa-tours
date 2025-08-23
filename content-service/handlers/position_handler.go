// content-service/handlers/position_handler.go
package handlers

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PositionHandler struct {
	DB *mongo.Database
}

type Position struct {
	ID        primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID    int                `json:"user_id" bson:"user_id"`
	Latitude  float64            `json:"latitude" bson:"latitude"`
	Longitude float64            `json:"longitude" bson:"longitude"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
	Accuracy  float64            `json:"accuracy,omitempty" bson:"accuracy,omitempty"`
}

type UpdatePositionRequest struct {
	Latitude  float64 `json:"latitude" binding:"required,min=-90,max=90"`
	Longitude float64 `json:"longitude" binding:"required,min=-180,max=180"`
	Accuracy  float64 `json:"accuracy,omitempty"`
}

func NewPositionHandler(db *mongo.Database) *PositionHandler {
	return &PositionHandler{DB: db}
}

// GET /positions/:userId - get current position for user
func (h *PositionHandler) GetUserPosition(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := h.DB.Collection("positions")

	// Find the most recent position for the user
	var position Position
	err = collection.FindOne(
		context.TODO(),
		bson.M{"user_id": userID},
		options.FindOne().SetSort(bson.M{"timestamp": -1}),
	).Decode(&position)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Position not found for user"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Position retrieved successfully",
		"position": position,
	})
}

// POST /positions/:userId - update user position
func (h *PositionHandler) UpdateUserPosition(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdatePositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection := h.DB.Collection("positions")

	// Create new position entry
	position := Position{
		UserID:    userID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Timestamp: time.Now(),
		Accuracy:  req.Accuracy,
	}

	// Use upsert to replace existing position or create new one
	filter := bson.M{"user_id": userID}
	update := bson.M{"$set": position}
	opts := options.Update().SetUpsert(true)

	result, err := collection.UpdateOne(context.TODO(), filter, update, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update position"})
		return
	}

	// Set the ID if it was inserted
	if result.UpsertedID != nil {
		position.ID = result.UpsertedID.(primitive.ObjectID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Position updated successfully",
		"position": position,
	})
}

// DELETE /positions/:userId - clear user position
func (h *PositionHandler) ClearUserPosition(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := h.DB.Collection("positions")

	result, err := collection.DeleteMany(context.TODO(), bson.M{"user_id": userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear position"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Position cleared successfully",
		"deleted_count": result.DeletedCount,
	})
}

// GET /positions - get all positions (for admin/debugging)
func (h *PositionHandler) GetAllPositions(c *gin.Context) {
	collection := h.DB.Collection("positions")

	cursor, err := collection.Find(
		context.TODO(),
		bson.M{},
		options.Find().SetSort(bson.M{"timestamp": -1}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(context.TODO())

	var positions []Position
	if err = cursor.All(context.TODO(), &positions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode positions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"positions": positions,
		"count":     len(positions),
	})
}

// Helper function to validate coordinates
func (h *PositionHandler) isValidCoordinates(lat, lng float64) bool {
	return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Helper function to calculate distance between two points using Haversine formula
func (h *PositionHandler) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0

	// Convert degrees to radians
	lat1Rad := lat1 * math.Pi / 180
	lon1Rad := lon1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	lon2Rad := lon2 * math.Pi / 180

	// Calculate differences
	dLat := lat2Rad - lat1Rad
	dLon := lon2Rad - lon1Rad

	// Apply Haversine formula
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}