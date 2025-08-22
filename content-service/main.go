package main

import (
    "context"
    "log"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "content-service/handlers"
    
)

type Blog struct {
    ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
    Title       string             `json:"title" bson:"title"`
    Description string             `json:"description" bson:"description"`
    AuthorID    int                `json:"author_id" bson:"author_id"`
    Images      []string           `json:"images" bson:"images"`
    Likes       []int              `json:"likes" bson:"likes"`
    Comments    []Comment          `json:"comments" bson:"comments"`
    CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
    UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

type Comment struct {
    UserID    int       `json:"user_id" bson:"user_id"`
    Text      string    `json:"text" bson:"text"`
    CreatedAt time.Time `json:"created_at" bson:"created_at"`
    UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateBlogRequest struct {
    Title       string   `json:"title" binding:"required,min=1,max=200"`
    Description string   `json:"description" binding:"required,min=1"`
    Images      []string `json:"images"`
}

type UpdateBlogRequest struct {
    Title       string   `json:"title" binding:"min=1,max=200"`
    Description string   `json:"description" binding:"min=1"`
    Images      []string `json:"images"`
}

var (
    mongoClient *mongo.Client
    blogsCollection *mongo.Collection
    db *mongo.Database  // Add this line
)

func main() {
    var err error
    
    // MongoDB connection
    mongoURI := os.Getenv("MONGODB_URI")
    if mongoURI == "" {
        mongoURI = "mongodb://admin:mongopassword123@localhost:27017/soa_tours_content?authSource=admin"
    }
    
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    mongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
    if err != nil {
        log.Fatal("Failed to connect to MongoDB:", err)
    }
    
    // Test connection
    if err = mongoClient.Ping(ctx, nil); err != nil {
        log.Fatal("Failed to ping MongoDB:", err)
    }
    log.Println("Connected to MongoDB")
    
    // Get collections
    db := mongoClient.Database("soa_tours_content")
    blogsCollection = db.Collection("blogs")

    router := gin.Default()

    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:4200", "http://127.0.0.1:4200"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "X-User-ID"}
    router.Use(cors.New(config))

    // Health check
    router.GET("/health", healthCheck)

    // Blog routes
    router.GET("/blogs", getBlogs)
    router.GET("/blogs/:id", getBlogByID)
    router.POST("/blogs", createBlog)
    router.PUT("/blogs/:id", updateBlog)
    router.DELETE("/blogs/:id", deleteBlog)
    
    // Blog interaction routes
    router.POST("/blogs/:id/like", likeBlog)
    router.DELETE("/blogs/:id/like", unlikeBlog)
    router.POST("/blogs/:id/comments", addComment)

    tourHandler := handlers.NewTourHandler(db)

    // Tour rute
    router.GET("/tours", tourHandler.GetTours)
    router.GET("/tours/:id", tourHandler.GetTourByID) 
    router.POST("/tours", AuthMiddleware(), tourHandler.CreateTour)
    router.PUT("/tours/:id", AuthMiddleware(), tourHandler.UpdateTour)

    // Keypoint rute
    router.POST("/tours/:id/keypoints", AuthMiddleware(), tourHandler.AddKeypoint)
    router.PUT("/tours/:id/keypoints/:order", AuthMiddleware(), tourHandler.UpdateKeypoint)
    router.DELETE("/tours/:id/keypoints/:order", AuthMiddleware(), tourHandler.RemoveKeypoint)

    // Tours routes (placeholder for future implementation)
    //router.GET("/tours", getToursPlaceholder)
   

    port := os.Getenv("PORT")
    if port == "" {
        port = "8082"
    }

    log.Printf("Content Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
            c.Abort()
            return
        }
        c.Next()
    }
}

func healthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status":    "healthy",
        "service":   "content-service",
        "timestamp": time.Now(),
        "database":  "mongodb",
    })
}

func getBlogs(c *gin.Context) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Get pagination parameters
    page := 1
    limit := 10
    
    if pageStr := c.Query("page"); pageStr != "" {
        if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
            page = p
        }
    }
    
    if limitStr := c.Query("limit"); limitStr != "" {
        if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
            limit = l
        }
    }

    skip := (page - 1) * limit

    // Find blogs with pagination, sorted by creation date (newest first)
    findOptions := options.Find()
    findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})
    findOptions.SetLimit(int64(limit))
    findOptions.SetSkip(int64(skip))

    cursor, err := blogsCollection.Find(ctx, bson.M{}, findOptions)
    if err != nil {
        log.Printf("Error finding blogs: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    defer cursor.Close(ctx)

    var blogs []Blog
    if err = cursor.All(ctx, &blogs); err != nil {
        log.Printf("Error decoding blogs: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    // Get total count
    total, err := blogsCollection.CountDocuments(ctx, bson.M{})
    if err != nil {
        log.Printf("Error counting blogs: %v", err)
        total = 0
    }

    c.JSON(http.StatusOK, gin.H{
        "blogs": blogs,
        "pagination": gin.H{
            "page":        page,
            "limit":       limit,
            "total":       total,
            "total_pages": (total + int64(limit) - 1) / int64(limit),
        },
    })
}

func getBlogByID(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var blog Blog
    err = blogsCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&blog)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
            return
        }
        log.Printf("Error finding blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"blog": blog})
}

func createBlog(c *gin.Context) {
    var req CreateBlogRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Get author ID from request header or context
    // For now, we'll use a dummy author ID or get it from header
    authorID := 1 // Default to admin
    if authorIDStr := c.GetHeader("X-User-ID"); authorIDStr != "" {
        if id, err := strconv.Atoi(authorIDStr); err == nil {
            authorID = id
        }
    }

    // Create new blog
    blog := Blog{
        Title:       req.Title,
        Description: req.Description,
        AuthorID:    authorID,
        Images:      req.Images,
        Likes:       []int{},
        Comments:    []Comment{},
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    result, err := blogsCollection.InsertOne(ctx, blog)
    if err != nil {
        log.Printf("Error creating blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create blog"})
        return
    }

    blog.ID = result.InsertedID.(primitive.ObjectID)

    c.JSON(http.StatusCreated, gin.H{
        "message": "Blog created successfully",
        "blog": blog,
    })
}

func updateBlog(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    var req UpdateBlogRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Build update document
    updateDoc := bson.M{
        "updated_at": time.Now(),
    }

    if req.Title != "" {
        updateDoc["title"] = req.Title
    }
    if req.Description != "" {
        updateDoc["description"] = req.Description
    }
    if req.Images != nil {
        updateDoc["images"] = req.Images
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := blogsCollection.UpdateOne(
        ctx,
        bson.M{"_id": objectID},
        bson.M{"$set": updateDoc},
    )
    if err != nil {
        log.Printf("Error updating blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update blog"})
        return
    }

    if result.MatchedCount == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Blog updated successfully"})
}

func deleteBlog(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    result, err := blogsCollection.DeleteOne(ctx, bson.M{"_id": objectID})
    if err != nil {
        log.Printf("Error deleting blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete blog"})
        return
    }

    if result.DeletedCount == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Blog deleted successfully"})
}

func likeBlog(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    // Get user ID from header
    userID := 1 // Default
    if userIDStr := c.GetHeader("X-User-ID"); userIDStr != "" {
        if id, err := strconv.Atoi(userIDStr); err == nil {
            userID = id
        }
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Add user to likes array if not already present
    _, err = blogsCollection.UpdateOne(
        ctx,
        bson.M{"_id": objectID},
        bson.M{"$addToSet": bson.M{"likes": userID}},
    )
    if err != nil {
        log.Printf("Error liking blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to like blog"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Blog liked successfully"})
}

func unlikeBlog(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    // Get user ID from header
    userID := 1 // Default
    if userIDStr := c.GetHeader("X-User-ID"); userIDStr != "" {
        if id, err := strconv.Atoi(userIDStr); err == nil {
            userID = id
        }
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Remove user from likes array
    _, err = blogsCollection.UpdateOne(
        ctx,
        bson.M{"_id": objectID},
        bson.M{"$pull": bson.M{"likes": userID}},
    )
    if err != nil {
        log.Printf("Error unliking blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlike blog"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Blog unliked successfully"})
}

func addComment(c *gin.Context) {
    idStr := c.Param("id")
    objectID, err := primitive.ObjectIDFromHex(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid blog ID"})
        return
    }

    var req struct {
        Text string `json:"text" binding:"required,min=1"`
        AuthorID int `json:"author_id"` // Dodano - može biti opciono
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Get user ID from header
    userID := 1 // Default
    if userIDStr := c.GetHeader("X-User-ID"); userIDStr != "" {
        if id, err := strconv.Atoi(userIDStr); err == nil {
            userID = id
        }
    }

    // NOVA LOGIKA: Prvo dobij blog da vidiš ko je autor
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var blog Blog
    err = blogsCollection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&blog)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
            return
        }
        log.Printf("Error finding blog: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    // Koristi author_id iz zahteva ili iz bloga
    authorID := blog.AuthorID
    if req.AuthorID != 0 {
        authorID = req.AuthorID
    }

    // KLJUČNA PROVERA: Pozovi stakeholders-service da proveri follow status
    canComment, err := canUserComment(userID, authorID)
    if err != nil {
        log.Printf("Error checking follow status: %v", err)
        // Ako nije moguće proveriti, odbaci zahtev iz bezbednosnih razloga
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to verify follow status",
            "details": err.Error(),
        })
        return
    }

    if !canComment {
        c.JSON(http.StatusForbidden, gin.H{
            "error": "You must follow the author to comment on their blog",
            "author_id": authorID,
            "message": "Follow the author first, then try commenting again",
        })
        return
    }

    // Follow provera prošla - dodaj komentar
    comment := Comment{
        UserID:    userID,
        Text:      req.Text,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }

    // Add comment to comments array
    _, err = blogsCollection.UpdateOne(
        ctx,
        bson.M{"_id": objectID},
        bson.M{"$push": bson.M{"comments": comment}},
    )
    if err != nil {
        log.Printf("Error adding comment: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "Comment added successfully - follow check passed",
        "comment": comment,
        "author_id": authorID,
    })
}

func getToursPlaceholder(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "message": "Tours endpoint - under development",
        "tours": []gin.H{},
    })
}

// Proveri da li korisnik može da komentariše blog
func canUserComment(userID int, authorID int) (bool, error) {
    stakeholdersURL := os.Getenv("STAKEHOLDERS_SERVICE_URL")
    if stakeholdersURL == "" {
        stakeholdersURL = "stakeholders-service:8081"
    }

    url := fmt.Sprintf("http://%s/can-comment/%d", stakeholdersURL, authorID)
    
    // Kreiranje HTTP zahteva sa mock user_id header-om
    req, err := http.NewRequest("GET", url, nil)
    if err != nil {
        return false, err
    }
    
    // Dodaj header da simulira authenticated user
    req.Header.Set("X-User-ID", fmt.Sprintf("%d", userID))

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return false, err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return false, err
    }

    var result map[string]interface{}
    if err := json.Unmarshal(body, &result); err != nil {
        return false, err
    }

    canComment, ok := result["can_comment"].(bool)
    if !ok {
        return false, fmt.Errorf("unexpected response format")
    }

    return canComment, nil
}

