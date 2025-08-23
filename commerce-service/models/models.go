package models

import (
    "database/sql"
    "time"
)

type ShoppingCart struct {
    ID         int       `json:"id" db:"id"`
    UserID     int       `json:"user_id" db:"user_id"`
    TotalPrice float64   `json:"total_price" db:"total_price"`
    CreatedAt  time.Time `json:"created_at" db:"created_at"`
    UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
    Items      []CartItem `json:"items,omitempty"`
}

type CartItem struct {
    ID        int       `json:"id" db:"id"`
    CartID    int       `json:"cart_id" db:"cart_id"`
    TourID    string    `json:"tour_id" db:"tour_id"`
    TourName  string    `json:"tour_name" db:"tour_name"`
    Price     float64   `json:"price" db:"price"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type PurchaseToken struct {
    ID          int            `json:"id" db:"id"`
    UserID      int            `json:"user_id" db:"user_id"`
    TourID      string         `json:"tour_id" db:"tour_id"`
    Token       string         `json:"token" db:"token"`
    PurchasedAt time.Time      `json:"purchased_at" db:"purchased_at"`
    ExpiresAt   sql.NullTime   `json:"expires_at,omitempty" db:"expires_at"`
    IsActive    bool           `json:"is_active" db:"is_active"`
}

// Request/Response models
type AddToCartRequest struct {
    TourID   string  `json:"tour_id" binding:"required"`
    TourName string  `json:"tour_name" binding:"required"`
    Price    float64 `json:"price" binding:"required,min=0"`
}

type CheckoutRequest struct {
    CartID int `json:"cart_id" binding:"required"`
}

type CheckoutResponse struct {
    Message string          `json:"message"`
    Tokens  []PurchaseToken `json:"tokens"`
    Total   float64         `json:"total"`
}

// Tour purchase check
type TourPurchaseInfo struct {
    TourID      string `json:"tour_id"`
    IsPurchased bool   `json:"is_purchased"`
    Token       string `json:"token,omitempty"`
}