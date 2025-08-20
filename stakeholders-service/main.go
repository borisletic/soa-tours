package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.Default()

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "healthy",
            "service": "stakeholders-service",
        })
    })

    // API routes (to be implemented)
    router.GET("/users", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Users endpoint - under development",
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }

    log.Printf("Stakeholders Service starting on port %s", port)
    log.Fatal(router.Run(":" + port))
}