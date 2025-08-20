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
            "service": "content-service",
        })
    })

    router.GET("/blogs", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Blogs endpoint - under development",
        })
    })

    router.GET("/tours", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Tours endpoint - under development",
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8082"
    }

    log.Printf("Content Service starting on port %s", port)
    log.Fatal(router.Run(":" + port))
}