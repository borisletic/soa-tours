// content-service/handlers/tour_execution_handler.go
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

type TourExecutionHandler struct {
	DB *mongo.Database
}

type TourExecution struct {
	ID                  primitive.ObjectID    `json:"id,omitempty" bson:"_id,omitempty"`
	UserID              int                   `json:"user_id" bson:"user_id"`
	TourID              primitive.ObjectID    `json:"tour_id" bson:"tour_id"`
	Status              string                `json:"status" bson:"status"` // active, completed, abandoned
	CurrentPosition     *Position             `json:"current_position,omitempty" bson:"current_position,omitempty"`
	CompletedKeypoints  []CompletedKeypoint   `json:"completed_keypoints" bson:"completed_keypoints"`
	StartedAt           time.Time             `json:"started_at" bson:"started_at"`
	CompletedAt         *time.Time            `json:"completed_at,omitempty" bson:"completed_at,omitempty"`
	AbandonedAt         *time.Time            `json:"abandoned_at,omitempty" bson:"abandoned_at,omitempty"`
	LastActivity        time.Time             `json:"last_activity" bson:"last_activity"`
}

type CompletedKeypoint struct {
	KeypointIndex int       `json:"keypoint_index" bson:"keypoint_index"`
	CompletedAt   time.Time `json:"completed_at" bson:"completed_at"`
	Latitude      float64   `json:"latitude" bson:"latitude"`
	Longitude     float64   `json:"longitude" bson:"longitude"`
}

type StartTourRequest struct {
	TourID string `json:"tour_id" binding:"required"`
}

type CheckKeypointsResponse struct {
	NearKeypoint       bool                `json:"near_keypoint"`
	KeypointIndex      int                 `json:"keypoint_index,omitempty"`
	KeypointName       string              `json:"keypoint_name,omitempty"`
	DistanceToKeypoint float64             `json:"distance_to_keypoint,omitempty"`
	CompletedKeypoint  *CompletedKeypoint  `json:"completed_keypoint,omitempty"`
	TourExecution      *TourExecution      `json:"tour_execution"`
}

func NewTourExecutionHandler(db *mongo.Database) *TourExecutionHandler {
	return &TourExecutionHandler{DB: db}
}

// POST /tours/start - start tour execution
func (h *TourExecutionHandler) StartTour(c *gin.Context) {
	// Get user ID from header (mock auth)
	userIDStr := c.GetHeader("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		userID = 1 // Default mock user
	}

	var req StartTourRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tourID, err := primitive.ObjectIDFromHex(req.TourID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tour ID"})
		return
	}

	// Check if tour exists
	toursCollection := h.DB.Collection("tours")
	var tour interface{}
	err = toursCollection.FindOne(context.TODO(), bson.M{"_id": tourID}).Decode(&tour)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get user's current position from position simulator
	positionsCollection := h.DB.Collection("positions")
	var userPosition Position
	err = positionsCollection.FindOne(
		context.TODO(),
		bson.M{"user_id": userID},
		options.FindOne().SetSort(bson.M{"timestamp": -1}),
	).Decode(&userPosition)
	
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Please set your position using the Position Simulator before starting a tour",
		})
		return
	}

	// Check if user already has an active tour
	executionsCollection := h.DB.Collection("tour_executions")
	var existingExecution TourExecution
	err = executionsCollection.FindOne(context.TODO(), bson.M{
		"user_id": userID,
		"status":  "active",
	}).Decode(&existingExecution)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "You already have an active tour. Please complete or abandon it first.",
		})
		return
	}

	// Create new tour execution
	execution := TourExecution{
		UserID:              userID,
		TourID:              tourID,
		Status:              "active",
		CurrentPosition:     &userPosition,
		CompletedKeypoints:  []CompletedKeypoint{},
		StartedAt:           time.Now(),
		LastActivity:        time.Now(),
	}

	result, err := executionsCollection.InsertOne(context.TODO(), execution)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start tour"})
		return
	}

	execution.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Tour started successfully",
		"tour_execution": execution,
	})
}

// POST /tours/check-keypoints - check if user is near any keypoint
func (h *TourExecutionHandler) CheckKeypoints(c *gin.Context) {
	userIDStr := c.GetHeader("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		userID = 1 // Default mock user
	}

	// Get user's active tour execution
	executionsCollection := h.DB.Collection("tour_executions")
	var execution TourExecution
	err = executionsCollection.FindOne(context.TODO(), bson.M{
		"user_id": userID,
		"status":  "active",
	}).Decode(&execution)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "No active tour found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get user's current position from position simulator
	positionsCollection := h.DB.Collection("positions")
	var userPosition Position
	err = positionsCollection.FindOne(
		context.TODO(),
		bson.M{"user_id": userID},
		options.FindOne().SetSort(bson.M{"timestamp": -1}),
	).Decode(&userPosition)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Position not found. Please update your position using the Position Simulator.",
		})
		return
	}

	// Update current position in execution
	execution.CurrentPosition = &userPosition
	execution.LastActivity = time.Now()

	// Get tour details to check keypoints
	toursCollection := h.DB.Collection("tours")
	var tour struct {
		Keypoints []struct {
			Name      string  `bson:"name"`
			Latitude  float64 `bson:"latitude"`
			Longitude float64 `bson:"longitude"`
			Order     int     `bson:"order"`
		} `bson:"keypoints"`
	}

	err = toursCollection.FindOne(context.TODO(), bson.M{"_id": execution.TourID}).Decode(&tour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load tour details"})
		return
	}

	response := CheckKeypointsResponse{
		NearKeypoint:  false,
		TourExecution: &execution,
	}

	// Check each keypoint
	const proximityRadiusMeters = 50.0
	
	for _, keypoint := range tour.Keypoints {
		// Check if this keypoint is already completed
		alreadyCompleted := false
		for _, completed := range execution.CompletedKeypoints {
			if completed.KeypointIndex == keypoint.Order {
				alreadyCompleted = true
				break
			}
		}

		if alreadyCompleted {
			continue
		}

		// Calculate distance to keypoint
		distance := h.calculateDistance(
			userPosition.Latitude,
			userPosition.Longitude,
			keypoint.Latitude,
			keypoint.Longitude,
		) * 1000 // Convert to meters

		if distance <= proximityRadiusMeters {
			// User is near this keypoint!
			response.NearKeypoint = true
			response.KeypointIndex = keypoint.Order
			response.KeypointName = keypoint.Name
			response.DistanceToKeypoint = distance

			// Mark keypoint as completed
			completedKeypoint := CompletedKeypoint{
				KeypointIndex: keypoint.Order,
				CompletedAt:   time.Now(),
				Latitude:      userPosition.Latitude,
				Longitude:     userPosition.Longitude,
			}

			execution.CompletedKeypoints = append(execution.CompletedKeypoints, completedKeypoint)
			response.CompletedKeypoint = &completedKeypoint

			// Check if this was the last keypoint
			if len(execution.CompletedKeypoints) == len(tour.Keypoints) {
				execution.Status = "completed"
				completedTime := time.Now()
				execution.CompletedAt = &completedTime
			}

			break
		}
	}

	// Update tour execution in database
	_, err = executionsCollection.UpdateOne(
		context.TODO(),
		bson.M{"_id": execution.ID},
		bson.M{"$set": execution},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tour execution"})
		return
	}

	response.TourExecution = &execution
	c.JSON(http.StatusOK, response)
}

// PUT /tours/:executionId/abandon - abandon tour
func (h *TourExecutionHandler) AbandonTour(c *gin.Context) {
	userIDStr := c.GetHeader("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		userID = 1 // Default mock user
	}

	executionIDStr := c.Param("executionId")
	executionID, err := primitive.ObjectIDFromHex(executionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid execution ID"})
		return
	}

	executionsCollection := h.DB.Collection("tour_executions")
	
	// Check if execution exists and belongs to user
	var execution TourExecution
	err = executionsCollection.FindOne(context.TODO(), bson.M{
		"_id":     executionID,
		"user_id": userID,
		"status":  "active",
	}).Decode(&execution)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Active tour execution not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Update status to abandoned
	abandonedTime := time.Now()
	_, err = executionsCollection.UpdateOne(
		context.TODO(),
		bson.M{"_id": executionID},
		bson.M{"$set": bson.M{
			"status":       "abandoned",
			"abandoned_at": abandonedTime,
			"last_activity": abandonedTime,
		}},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to abandon tour"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tour abandoned successfully",
	})
}

// GET /tours/executions - get user's tour executions
func (h *TourExecutionHandler) GetUserExecutions(c *gin.Context) {
	userIDStr := c.GetHeader("X-User-ID")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		userID = 1 // Default mock user
	}

	executionsCollection := h.DB.Collection("tour_executions")

	cursor, err := executionsCollection.Find(
		context.TODO(),
		bson.M{"user_id": userID},
		options.Find().SetSort(bson.M{"started_at": -1}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer cursor.Close(context.TODO())

	var executions []TourExecution
	if err = cursor.All(context.TODO(), &executions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode executions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"executions": executions,
		"count":      len(executions),
	})
}

// Helper function to calculate distance using Haversine formula
func (h *TourExecutionHandler) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0

	lat1Rad := lat1 * math.Pi / 180
	lon1Rad := lon1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	lon2Rad := lon2 * math.Pi / 180

	dLat := lat2Rad - lat1Rad
	dLon := lon2Rad - lon1Rad

	a := math.Sin(dLat/2)*math.Sin(dLat/2) + 
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}