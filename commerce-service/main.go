package main

import (
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
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}

func main() {
    router := gin.Default()

    // Dodaj CORS middleware
    router.Use(CORSMiddleware())

    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "healthy",
            "service": "commerce-service",
        })
    })

    router.GET("/cart", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Shopping cart endpoint - under development",
            "cart": gin.H{
                "items": []gin.H{
                    {
                        "id": 1,
                        "tour_name": "Historic Downtown Tour",
                        "price": 25.00,
                        "quantity": 1,
                    },
                    {
                        "id": 2,
                        "tour_name": "Riverside Walk",
                        "price": 15.00,
                        "quantity": 2,
                    },
                },
                "total": 55.00,
            },
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8083"
    }

    log.Printf("Commerce Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}