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

    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:4200", "http://frontend"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    router.Use(cors.New(config))

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "healthy",
            "service": "api-gateway",
        })
    })

    // Proxy routes (to be implemented)
    router.Any("/stakeholders/*path", proxyHandler("stakeholders-service:8081"))
    router.Any("/content/*path", proxyHandler("content-service:8082"))
    router.Any("/commerce/*path", proxyHandler("commerce-service:8083"))

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("API Gateway starting on port %s", port)
    log.Fatal(router.Run(":" + port))
}

func proxyHandler(target string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Proxy to " + target + " - Service under development",
            "path": c.Request.URL.Path,
        })
    }
}