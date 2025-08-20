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
            "service": "commerce-service",
        })
    })

    // API routes (to be implemented)
    router.GET("/cart", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Shopping cart endpoint - under development",
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8083"
    }

    log.Printf("Commerce Service starting on port %s", port)
    log.Fatal(router.Run(":" + port))
}