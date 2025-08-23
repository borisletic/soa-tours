package models

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type Keypoint struct {
    Name        string    `bson:"name" json:"name"`
    Description string    `bson:"description" json:"description"`
    Latitude    float64   `bson:"latitude" json:"latitude"`
    Longitude   float64   `bson:"longitude" json:"longitude"`
    Images      []string  `bson:"images" json:"images"`
    Order       int       `bson:"order" json:"order"`
}

type Tour struct {
    ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Name           string            `bson:"name" json:"name"`
    Description    string            `bson:"description" json:"description"`
    AuthorID       int               `bson:"author_id" json:"author_id"`
    Status         string            `bson:"status" json:"status"` // draft, published, archived
    Difficulty     string            `bson:"difficulty" json:"difficulty"` // easy, medium, hard
    Price          float64           `bson:"price" json:"price"`
    DistanceKm     float64           `bson:"distance_km" json:"distance_km"`
    Tags           []string          `bson:"tags" json:"tags"`
    Keypoints      []Keypoint        `bson:"keypoints" json:"keypoints"`
    TransportTimes []TransportTime   `bson:"transport_times" json:"transport_times"` // ✅ DODANO
    Reviews        []Review          `bson:"reviews" json:"reviews"`
    CreatedAt      time.Time         `bson:"created_at" json:"created_at"`
    UpdatedAt      time.Time         `bson:"updated_at" json:"updated_at"`
    PublishedAt    *time.Time        `bson:"published_at,omitempty" json:"published_at,omitempty"`
    ArchivedAt     *time.Time        `bson:"archived_at,omitempty" json:"archived_at,omitempty"`
}

type Review struct {
    UserID     int       `bson:"user_id" json:"user_id"`
    Rating     int       `bson:"rating" json:"rating"` // 1-5
    Comment    string    `bson:"comment" json:"comment"`
    VisitDate  time.Time `bson:"visit_date" json:"visit_date"`
    CreatedAt  time.Time `bson:"created_at" json:"created_at"`
    Images     []string  `bson:"images" json:"images"`
}

type CreateTourRequest struct {
    Name        string   `json:"name" binding:"required,min=1,max=100"`
    Description string   `json:"description" binding:"required,min=1"`
    Difficulty  string   `json:"difficulty" binding:"required,oneof=easy medium hard"`
    Tags        []string `json:"tags"`
}

type UpdateTourRequest struct {
    Name        string   `json:"name" binding:"min=1,max=100"`
    Description string   `json:"description" binding:"min=1"`
    Difficulty  string   `json:"difficulty" binding:"oneof=easy medium hard"`
    Price       float64  `json:"price" binding:"min=0"`
    DistanceKm  float64  `json:"distance_km" binding:"min=0"`
    Tags        []string `json:"tags"`
    Status      string   `json:"status" binding:"oneof=draft published archived"`
}

type AddKeypointRequest struct {
    Name        string   `json:"name" binding:"required,min=1"`
    Description string   `json:"description" binding:"required,min=1"`
    Latitude    float64  `json:"latitude" binding:"required,min=-90,max=90"`
    Longitude   float64  `json:"longitude" binding:"required,min=-180,max=180"`
    Images      []string `json:"images"`
}

type UpdateKeypointRequest struct {
    Name        string   `json:"name" binding:"min=1"`
    Description string   `json:"description" binding:"min=1"`
    Latitude    float64  `json:"latitude" binding:"min=-90,max=90"`
    Longitude   float64  `json:"longitude" binding:"min=-180,max=180"`
    Images      []string `json:"images"`
    Order       int      `json:"order" binding:"min=0"`
}

type TransportTime struct {
    TransportType   string `bson:"transport_type" json:"transport_type"` // walking, bicycle, car
    DurationMinutes int    `bson:"duration_minutes" json:"duration_minutes"`
}

