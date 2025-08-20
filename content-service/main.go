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
            "service": "content-service",
        })
    })

    // TOURS endpoint
    router.GET("/tours", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Tours endpoint - under development",
            "tours": []gin.H{
                {
                    "id": 1,
                    "name": "Historic Downtown Tour",
                    "description": "Explore the historic downtown area",
                    "price": 25.00,
                    "duration": "2 hours",
                    "difficulty": "easy",
                    "location": "Downtown Belgrade",
                },
                {
                    "id": 2,
                    "name": "Riverside Walk", 
                    "description": "Beautiful walk along the river",
                    "price": 15.00,
                    "duration": "1.5 hours",
                    "difficulty": "easy",
                    "location": "Danube River",
                },
                {
                    "id": 3,
                    "name": "Mountain Hiking Adventure", 
                    "description": "Challenging hike through mountain trails",
                    "price": 45.00,
                    "duration": "4 hours",
                    "difficulty": "hard",
                    "location": "Avala Mountain",
                },
            },
        })
    })

    // BLOGS endpoint - DODAJ OVO!
    router.GET("/blogs", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Blogs endpoint - under development",
            "blogs": []gin.H{
                {
                    "id": 1,
                    "title": "Welcome to SOA Tours",
                    "content": "Discover amazing tours with our microservices platform...",
                    "author": "Admin",
                    "created_at": "2024-08-20",
                    "tags": []string{"welcome", "announcement"},
                },
                {
                    "id": 2,
                    "title": "Best Tourist Spots in Belgrade",
                    "content": "Belgrade offers incredible sights and experiences...",
                    "author": "Tour Guide",
                    "created_at": "2024-08-19",
                    "tags": []string{"belgrade", "tourism", "guide"},
                },
                {
                    "id": 3,
                    "title": "How to Choose the Perfect Tour",
                    "content": "Selecting the right tour depends on your interests...",
                    "author": "Travel Expert",
                    "created_at": "2024-08-18",
                    "tags": []string{"tips", "planning", "advice"},
                },
            },
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8082"
    }

    log.Printf("Content Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}