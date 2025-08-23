// commerce-service/main.go
package main

import (
    "commerce-service/database"
    "commerce-service/handlers"
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
)

// CORS middleware
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-User-ID")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}

// Auth middleware to check X-User-ID header
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Skip auth for health check
        if c.Request.URL.Path == "/health" {
            c.Next()
            return
        }

        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User-ID header required"})
            c.Abort()
            return
        }
        c.Next()
    }
}

func main() {
    // Get database connection string
    mysqlDSN := os.Getenv("MYSQL_DSN")
    if mysqlDSN == "" {
        mysqlDSN = "soa_user:soa_password123@tcp(localhost:3306)/soa_tours?charset=utf8mb4&parseTime=True&loc=Local"
    }

    // Initialize database
    db, err := database.NewDatabase(mysqlDSN)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    // Initialize handlers
    commerceHandler := handlers.NewCommerceHandler(db)

    // Initialize router
    router := gin.Default()

    // Add middlewares
    router.Use(CORSMiddleware())
    router.Use(AuthMiddleware())

    // Health check endpoint (no auth required)
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "healthy",
            "service": "commerce-service",
        })
    })

    // Shopping cart endpoints
    router.GET("/cart", commerceHandler.GetCart)
    router.POST("/cart/add", commerceHandler.AddToCart)
    router.DELETE("/cart/remove/:tourId", commerceHandler.RemoveFromCart)

    // Checkout endpoint
    router.POST("/checkout", commerceHandler.Checkout)

    // Purchase management endpoints
    router.GET("/purchases", commerceHandler.GetPurchases)
    router.GET("/purchase/check/:tourId", commerceHandler.CheckTourPurchase)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8083"
    }

    log.Printf("Commerce Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}