package handlers

import (
    "commerce-service/database"
    "commerce-service/models"
    "crypto/rand"
    "encoding/hex"
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

type CommerceHandler struct {
    DB *database.DB
}

func NewCommerceHandler(db *database.DB) *CommerceHandler {
    return &CommerceHandler{DB: db}
}

// GET /cart - Get user's shopping cart
func (h *CommerceHandler) GetCart(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    // Get or create cart
    cart, err := h.getOrCreateCart(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart"})
        return
    }

    // Get cart items
    items, err := h.getCartItems(cart.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart items"})
        return
    }

    cart.Items = items
    c.JSON(http.StatusOK, gin.H{
        "cart": cart,
        "message": "Cart retrieved successfully",
    })
}

// POST /cart/add - Add tour to cart
func (h *CommerceHandler) AddToCart(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    var req models.AddToCartRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check if user already purchased this tour
    purchased, err := h.hasPurchasedTour(userID, req.TourID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check purchase status"})
        return
    }
    if purchased {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Tour already purchased"})
        return
    }

    // Get or create cart
    cart, err := h.getOrCreateCart(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart"})
        return
    }

    // Check if tour already in cart
    exists, err := h.tourExistsInCart(cart.ID, req.TourID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check cart"})
        return
    }
    if exists {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Tour already in cart"})
        return
    }

    // Add to cart
    _, err = h.DB.Exec(`
        INSERT INTO cart_items (cart_id, tour_id, tour_name, price) 
        VALUES (?, ?, ?, ?)`,
        cart.ID, req.TourID, req.TourName, req.Price,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to cart"})
        return
    }

    // Update cart total
    if err := h.updateCartTotal(cart.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cart total"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Tour added to cart successfully",
    })
}

// DELETE /cart/remove/:tourId - Remove tour from cart
func (h *CommerceHandler) RemoveFromCart(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    tourID := c.Param("tourId")

    // Get cart
    cart, err := h.getOrCreateCart(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart"})
        return
    }

    // Remove from cart
    result, err := h.DB.Exec(`
        DELETE FROM cart_items 
        WHERE cart_id = ? AND tour_id = ?`,
        cart.ID, tourID,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from cart"})
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Tour not found in cart"})
        return
    }

    // Update cart total
    if err := h.updateCartTotal(cart.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update cart total"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Tour removed from cart successfully",
    })
}

// POST /checkout - Checkout cart and create purchase tokens
func (h *CommerceHandler) Checkout(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    // Get cart
    cart, err := h.getOrCreateCart(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart"})
        return
    }

    // Get cart items
    items, err := h.getCartItems(cart.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get cart items"})
        return
    }

    if len(items) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
        return
    }

    // Create purchase tokens for each item
    var tokens []models.PurchaseToken
    for _, item := range items {
        token, err := h.createPurchaseToken(userID, item.TourID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create purchase token"})
            return
        }
        tokens = append(tokens, token)
    }

    // Clear cart
    if err := h.clearCart(cart.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cart"})
        return
    }

    response := models.CheckoutResponse{
        Message: "Checkout completed successfully",
        Tokens:  tokens,
        Total:   cart.TotalPrice,
    }

    c.JSON(http.StatusOK, response)
}

// GET /purchases - Get user's purchased tours
func (h *CommerceHandler) GetPurchases(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    rows, err := h.DB.Query(`
        SELECT id, user_id, tour_id, token, purchased_at, expires_at, is_active
        FROM purchase_tokens 
        WHERE user_id = ? AND is_active = true
        ORDER BY purchased_at DESC`,
        userID,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get purchases"})
        return
    }
    defer rows.Close()

    var tokens []models.PurchaseToken
    for rows.Next() {
        var token models.PurchaseToken
        err := rows.Scan(
            &token.ID, &token.UserID, &token.TourID, &token.Token,
            &token.PurchasedAt, &token.ExpiresAt, &token.IsActive,
        )
        if err != nil {
            continue
        }
        tokens = append(tokens, token)
    }

    c.JSON(http.StatusOK, gin.H{
        "purchases": tokens,
        "count":     len(tokens),
    })
}

// GET /purchase/check/:tourId - Check if user purchased specific tour
func (h *CommerceHandler) CheckTourPurchase(c *gin.Context) {
    userIDStr := c.GetHeader("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil || userID <= 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    tourID := c.Param("tourId")

    var token string
    err = h.DB.QueryRow(`
        SELECT token FROM purchase_tokens 
        WHERE user_id = ? AND tour_id = ? AND is_active = true
        LIMIT 1`,
        userID, tourID,
    ).Scan(&token)

    info := models.TourPurchaseInfo{
        TourID:      tourID,
        IsPurchased: err == nil,
    }

    if err == nil {
        info.Token = token
    }

    c.JSON(http.StatusOK, info)
}

// Helper methods
func (h *CommerceHandler) getOrCreateCart(userID int) (*models.ShoppingCart, error) {
    var cart models.ShoppingCart
    
    err := h.DB.QueryRow(`
        SELECT id, user_id, total_price, created_at, updated_at
        FROM shopping_carts WHERE user_id = ?`,
        userID,
    ).Scan(&cart.ID, &cart.UserID, &cart.TotalPrice, &cart.CreatedAt, &cart.UpdatedAt)

    if err == nil {
        return &cart, nil
    }

    // Create new cart
    result, err := h.DB.Exec(`
        INSERT INTO shopping_carts (user_id, total_price) 
        VALUES (?, 0.00)`,
        userID,
    )
    if err != nil {
        return nil, err
    }

    cartID, err := result.LastInsertId()
    if err != nil {
        return nil, err
    }

    cart.ID = int(cartID)
    cart.UserID = userID
    cart.TotalPrice = 0.00
    
    return &cart, nil
}

func (h *CommerceHandler) getCartItems(cartID int) ([]models.CartItem, error) {
    rows, err := h.DB.Query(`
        SELECT id, cart_id, tour_id, tour_name, price, created_at
        FROM cart_items WHERE cart_id = ?
        ORDER BY created_at DESC`,
        cartID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var items []models.CartItem
    for rows.Next() {
        var item models.CartItem
        err := rows.Scan(
            &item.ID, &item.CartID, &item.TourID,
            &item.TourName, &item.Price, &item.CreatedAt,
        )
        if err != nil {
            continue
        }
        items = append(items, item)
    }

    return items, nil
}

func (h *CommerceHandler) updateCartTotal(cartID int) error {
    _, err := h.DB.Exec(`
        UPDATE shopping_carts 
        SET total_price = (
            SELECT COALESCE(SUM(price), 0) 
            FROM cart_items 
            WHERE cart_id = ?
        ),
        updated_at = NOW()
        WHERE id = ?`,
        cartID, cartID,
    )
    return err
}

func (h *CommerceHandler) tourExistsInCart(cartID int, tourID string) (bool, error) {
    var count int
    err := h.DB.QueryRow(`
        SELECT COUNT(*) FROM cart_items 
        WHERE cart_id = ? AND tour_id = ?`,
        cartID, tourID,
    ).Scan(&count)
    return count > 0, err
}

func (h *CommerceHandler) hasPurchasedTour(userID int, tourID string) (bool, error) {
    var count int
    err := h.DB.QueryRow(`
        SELECT COUNT(*) FROM purchase_tokens 
        WHERE user_id = ? AND tour_id = ? AND is_active = true`,
        userID, tourID,
    ).Scan(&count)
    return count > 0, err
}

func (h *CommerceHandler) createPurchaseToken(userID int, tourID string) (models.PurchaseToken, error) {
    // Generate random token
    bytes := make([]byte, 32)
    rand.Read(bytes)
    token := hex.EncodeToString(bytes)

    result, err := h.DB.Exec(`
        INSERT INTO purchase_tokens (user_id, tour_id, token, is_active) 
        VALUES (?, ?, ?, true)`,
        userID, tourID, token,
    )
    if err != nil {
        return models.PurchaseToken{}, err
    }

    tokenID, _ := result.LastInsertId()

    purchaseToken := models.PurchaseToken{
        ID:       int(tokenID),
        UserID:   userID,
        TourID:   tourID,
        Token:    token,
        IsActive: true,
    }

    return purchaseToken, nil
}

func (h *CommerceHandler) clearCart(cartID int) error {
    _, err := h.DB.Exec(`DELETE FROM cart_items WHERE cart_id = ?`, cartID)
    if err != nil {
        return err
    }

    return h.updateCartTotal(cartID)
}