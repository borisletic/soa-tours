package main

import (
    "database/sql"
    "log"
    "net/http"
    "os"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    _ "github.com/go-sql-driver/mysql"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID           int    `json:"id" db:"id"`
    Username     string `json:"username" db:"username"`
    Email        string `json:"email" db:"email"`
    PasswordHash string `json:"-" db:"password_hash"`
    Role         string `json:"role" db:"role"`
    IsBlocked    bool   `json:"is_blocked" db:"is_blocked"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Profile struct {
    ID           int    `json:"id" db:"id"`
    UserID       int    `json:"user_id" db:"user_id"`
    FirstName    string `json:"first_name" db:"first_name"`
    LastName     string `json:"last_name" db:"last_name"`
    ProfileImage string `json:"profile_image" db:"profile_image"`
    Biography    string `json:"biography" db:"biography"`
    Motto        string `json:"motto" db:"motto"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type UserWithProfile struct {
    User
    Profile *Profile `json:"profile,omitempty"`
}

type RegisterRequest struct {
    Username  string `json:"username" binding:"required,min=3,max=50"`
    Email     string `json:"email" binding:"required,email"`
    Password  string `json:"password" binding:"required,min=6"`
    Role      string `json:"role" binding:"required,oneof=guide tourist"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
    Biography string `json:"biography"`
    Motto     string `json:"motto"`
}

type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
    FirstName    string `json:"first_name"`
    LastName     string `json:"last_name"`
    ProfileImage string `json:"profile_image"`
    Biography    string `json:"biography"`
    Motto        string `json:"motto"`
}

var db *sql.DB

func main() {
    var err error
    
    // Database connection
    dsn := os.Getenv("MYSQL_DSN")
    if dsn == "" {
        dsn = "soa_user:soa_password123@tcp(localhost:3307)/soa_tours?charset=utf8mb4&parseTime=True&loc=Local"
    }
    
    db, err = sql.Open("mysql", dsn)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    // Test database connection
    if err = db.Ping(); err != nil {
        log.Fatal("Failed to ping database:", err)
    }
    log.Println("Connected to MySQL database")

    router := gin.Default()

    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:4200", "http://127.0.0.1:4200"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    router.Use(cors.New(config))

    // Health check
    router.GET("/health", healthCheck)

    // Authentication routes
    router.POST("/auth/register", registerUser)
    router.POST("/auth/login", loginUser)

    // User routes
    router.GET("/users", getUsers)
    router.GET("/users/:id", getUserByID)
    router.GET("/users/:id/profile", getUserProfile)
    router.PUT("/users/:id/profile", updateUserProfile)

    // Profile routes
    router.GET("/profiles", getProfiles)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8081"
    }

    log.Printf("Stakeholders Service starting on port %s", port)
    log.Fatal(router.Run("0.0.0.0:" + port))
}

func healthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status":  "healthy",
        "service": "stakeholders-service",
        "timestamp": time.Now(),
    })
}

func registerUser(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check if user already exists
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", req.Username, req.Email).Scan(&count)
    if err != nil {
        log.Printf("Error checking existing user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    
    if count > 0 {
        c.JSON(http.StatusConflict, gin.H{"error": "User with this username or email already exists"})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        log.Printf("Error hashing password: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
        return
    }

    // Start transaction
    tx, err := db.Begin()
    if err != nil {
        log.Printf("Error starting transaction: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    defer tx.Rollback()

    // Insert user
    result, err := tx.Exec(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        req.Username, req.Email, string(hashedPassword), req.Role,
    )
    if err != nil {
        log.Printf("Error inserting user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
        return
    }

    userID, err := result.LastInsertId()
    if err != nil {
        log.Printf("Error getting user ID: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user ID"})
        return
    }

    // Insert profile
    _, err = tx.Exec(
        "INSERT INTO profiles (user_id, first_name, last_name, biography, motto) VALUES (?, ?, ?, ?, ?)",
        userID, req.FirstName, req.LastName, req.Biography, req.Motto,
    )
    if err != nil {
        log.Printf("Error inserting profile: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
        return
    }

    // Commit transaction
    if err = tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete registration"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "User registered successfully",
        "user_id": userID,
        "username": req.Username,
        "role": req.Role,
    })
}

func loginUser(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var user User
    err := db.QueryRow(
        "SELECT id, username, email, password_hash, role, is_blocked FROM users WHERE username = ?",
        req.Username,
    ).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Role, &user.IsBlocked)
    
    if err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
            return
        }
        log.Printf("Error querying user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if user.IsBlocked {
        c.JSON(http.StatusForbidden, gin.H{"error": "Account is blocked"})
        return
    }

    // Check password
    err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }

    // TODO: Generate JWT token here
    c.JSON(http.StatusOK, gin.H{
        "message": "Login successful",
        "user": gin.H{
            "id":       user.ID,
            "username": user.Username,
            "email":    user.Email,
            "role":     user.Role,
        },
    })
}

func getUsers(c *gin.Context) {
    rows, err := db.Query(`
        SELECT u.id, u.username, u.email, u.role, u.is_blocked, u.created_at, u.updated_at,
               p.first_name, p.last_name, p.profile_image, p.biography, p.motto
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
    `)
    if err != nil {
        log.Printf("Error querying users: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    defer rows.Close()

    var users []UserWithProfile
    for rows.Next() {
        var user UserWithProfile
        var profile Profile
        var firstName, lastName, profileImage, biography, motto sql.NullString

        err := rows.Scan(
            &user.ID, &user.Username, &user.Email, &user.Role, &user.IsBlocked, &user.CreatedAt, &user.UpdatedAt,
            &firstName, &lastName, &profileImage, &biography, &motto,
        )
        if err != nil {
            log.Printf("Error scanning user: %v", err)
            continue
        }

        if firstName.Valid {
            profile.UserID = user.ID
            profile.FirstName = firstName.String
            profile.LastName = lastName.String
            profile.ProfileImage = profileImage.String
            profile.Biography = biography.String
            profile.Motto = motto.String
            user.Profile = &profile
        }

        users = append(users, user)
    }

    c.JSON(http.StatusOK, gin.H{
        "users": users,
        "count": len(users),
    })
}

func getUserByID(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    var user UserWithProfile
    var profile Profile
    var firstName, lastName, profileImage, biography, motto sql.NullString

    err = db.QueryRow(`
        SELECT u.id, u.username, u.email, u.role, u.is_blocked, u.created_at, u.updated_at,
               p.first_name, p.last_name, p.profile_image, p.biography, p.motto
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
    `, id).Scan(
        &user.ID, &user.Username, &user.Email, &user.Role, &user.IsBlocked, &user.CreatedAt, &user.UpdatedAt,
        &firstName, &lastName, &profileImage, &biography, &motto,
    )

    if err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        log.Printf("Error querying user: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if firstName.Valid {
        profile.UserID = user.ID
        profile.FirstName = firstName.String
        profile.LastName = lastName.String
        profile.ProfileImage = profileImage.String
        profile.Biography = biography.String
        profile.Motto = motto.String
        user.Profile = &profile
    }

    c.JSON(http.StatusOK, gin.H{"user": user})
}

func getUserProfile(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    var profile Profile
    var firstName, lastName, profileImage, biography, motto sql.NullString
    var createdAt, updatedAt time.Time
    var profileID, userID int

    err = db.QueryRow(
        "SELECT id, user_id, first_name, last_name, profile_image, biography, motto, created_at, updated_at FROM profiles WHERE user_id = ?",
        id,
    ).Scan(&profileID, &userID, &firstName, &lastName, &profileImage, &biography, &motto, &createdAt, &updatedAt)

    if err != nil {
        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
            return
        }
        log.Printf("Error querying profile: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    // Assign values, handling NULL cases
    profile.ID = profileID
    profile.UserID = userID
    profile.FirstName = firstName.String
    profile.LastName = lastName.String
    profile.ProfileImage = profileImage.String
    profile.Biography = biography.String
    profile.Motto = motto.String
    profile.CreatedAt = createdAt
    profile.UpdatedAt = updatedAt

    c.JSON(http.StatusOK, gin.H{"profile": profile})
}

func updateUserProfile(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    var req UpdateProfileRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check if profile exists
    var count int
    err = db.QueryRow("SELECT COUNT(*) FROM profiles WHERE user_id = ?", id).Scan(&count)
    if err != nil {
        log.Printf("Error checking profile: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    if count == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
        return
    }

    _, err = db.Exec(`
        UPDATE profiles 
        SET first_name = ?, last_name = ?, profile_image = ?, biography = ?, motto = ?, updated_at = NOW()
        WHERE user_id = ?
    `, req.FirstName, req.LastName, req.ProfileImage, req.Biography, req.Motto, id)

    if err != nil {
        log.Printf("Error updating profile: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func getProfiles(c *gin.Context) {
    rows, err := db.Query(`
        SELECT p.id, p.user_id, p.first_name, p.last_name, p.profile_image, p.biography, p.motto, p.created_at, p.updated_at,
               u.username, u.role
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.updated_at DESC
    `)
    if err != nil {
        log.Printf("Error querying profiles: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    defer rows.Close()

    var profiles []map[string]interface{}
    for rows.Next() {
        var profile Profile
        var username, role string

        err := rows.Scan(
            &profile.ID, &profile.UserID, &profile.FirstName, &profile.LastName, 
            &profile.ProfileImage, &profile.Biography, &profile.Motto, 
            &profile.CreatedAt, &profile.UpdatedAt, &username, &role,
        )
        if err != nil {
            log.Printf("Error scanning profile: %v", err)
            continue
        }

        profileData := map[string]interface{}{
            "id":            profile.ID,
            "user_id":       profile.UserID,
            "first_name":    profile.FirstName,
            "last_name":     profile.LastName,
            "profile_image": profile.ProfileImage,
            "biography":     profile.Biography,
            "motto":         profile.Motto,
            "created_at":    profile.CreatedAt,
            "updated_at":    profile.UpdatedAt,
            "username":      username,
            "role":          role,
        }

        profiles = append(profiles, profileData)
    }

    c.JSON(http.StatusOK, gin.H{
        "profiles": profiles,
        "count":    len(profiles),
    })
}