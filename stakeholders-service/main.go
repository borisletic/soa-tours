package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
)

func main() {
    router := gin.Default()

    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "healthy",
            "service": "stakeholders-service",
        })
    })

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
    // Explicitly bind to 0.0.0.0 instead of default 127.0.0.1
    log.Fatal(router.Run("0.0.0.0:" + port))
}