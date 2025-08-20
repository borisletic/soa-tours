package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    router := gin.Default()

    // CORS konfiguracija
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:4200", "http://127.0.0.1:4200"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    router.Use(cors.New(config))

    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "healthy",
            "service": "stakeholders-service",
        })
    })

    router.GET("/users", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Users endpoint - under development",
            "users": []gin.H{
                {"id": 1, "name": "John Doe", "role": "guide"},
                {"id": 2, "name": "Jane Smith", "role": "tourist"},
            },
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }

    log.Printf("Stakeholders Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}