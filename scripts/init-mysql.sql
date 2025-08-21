-- SOA Tours MySQL Database Initialization
-- This script creates the database schema for the microservices application

-- Set proper SQL mode and character set
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- Create database if not exists (redundant but safe)
CREATE DATABASE IF NOT EXISTS soa_tours 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

-- Use the database
USE soa_tours;

-- Drop tables if they exist (for clean reinitialization)
DROP TABLE IF EXISTS purchase_tokens;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS shopping_carts;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

-- Users table - Core user authentication and roles
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'guide', 'tourist') NOT NULL DEFAULT 'tourist',
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles table - Extended user information
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    profile_image VARCHAR(500),
    biography TEXT,
    motto VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_full_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shopping carts table - User shopping carts
CREATE TABLE shopping_carts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_price DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_user_cart (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart items table - Items in shopping carts
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    tour_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId as string (24 chars)
    tour_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (cart_id) REFERENCES shopping_carts(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_cart_id (cart_id),
    INDEX idx_tour_id (tour_id),
    
    -- Ensure unique tour per cart
    UNIQUE KEY unique_cart_tour (cart_id, tour_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase tokens table - Proof of purchase for tours
CREATE TABLE purchase_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tour_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId as string
    token VARCHAR(64) UNIQUE NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_tour_id (tour_id),
    INDEX idx_token (token),
    INDEX idx_purchased_at (purchased_at),
    
    -- Ensure unique active token per user-tour combination
    UNIQUE KEY unique_user_tour_active (user_id, tour_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Follows table - User following relationships
CREATE TABLE follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id),
    INDEX idx_created_at (created_at),
    
    -- Prevent duplicate follows and self-follows
    UNIQUE KEY unique_follow (follower_id, following_id),
    CHECK (follower_id != following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog comments table - Store comments from content service
CREATE TABLE blog_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId from content service
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_blog_id (blog_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@soatours.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert admin profile
INSERT INTO profiles (user_id, first_name, last_name, biography, motto) VALUES 
(1, 'System', 'Administrator', 'System administrator for SOA Tours platform', 'Making tours accessible to everyone');

-- Create default shopping cart for admin
INSERT INTO shopping_carts (user_id) VALUES (1);

-- Insert sample guide user
INSERT INTO users (username, email, password_hash, role) VALUES 
('guide1', 'guide@soatours.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'guide');

INSERT INTO profiles (user_id, first_name, last_name, biography, motto) VALUES 
(2, 'John', 'Guide', 'Experienced tour guide specializing in historical tours', 'History comes alive through stories');

INSERT INTO shopping_carts (user_id) VALUES (2);

-- Insert sample tourist user
INSERT INTO users (username, email, password_hash, role) VALUES 
('tourist1', 'tourist@soatours.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tourist');

INSERT INTO profiles (user_id, first_name, last_name, biography, motto) VALUES 
(3, 'Jane', 'Tourist', 'Adventure seeker and travel enthusiast', 'Life is an adventure waiting to happen');

INSERT INTO shopping_carts (user_id) VALUES (3);

-- Sample follow relationships
INSERT INTO follows (follower_id, following_id) VALUES 
(3, 2), -- tourist1 follows guide1
(1, 2); -- admin follows guide1

-- Show final table status including new tables
SELECT 'Follow relationships created' as Status;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'soa_tours' AND TABLE_NAME IN ('follows', 'blog_comments');

-- Show final table status
SELECT 'MySQL Database Initialization Completed' as Status;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'soa_tours' AND TABLE_TYPE = 'BASE TABLE';