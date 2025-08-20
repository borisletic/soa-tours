// SOA Tours MongoDB Database Initialization
// This script sets up collections and indexes for the content service

print("Starting MongoDB initialization for SOA Tours...");

// Switch to the soa_tours_content database
const dbName = 'soa_tours_content';
db = db.getSiblingDB(dbName);

print(`Connected to database: ${dbName}`);

// Drop existing collections for clean initialization
const collectionsToClean = ['blogs', 'tours', 'follows', 'tour_executions', 'positions'];
collectionsToClean.forEach(collection => {
    try {
        db[collection].drop();
        print(`Dropped existing collection: ${collection}`);
    } catch (e) {
        print(`Collection ${collection} does not exist, skipping drop.`);
    }
});

// Create blogs collection with validation
print("Creating blogs collection...");
db.createCollection('blogs', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["title", "description", "author_id", "created_at"],
            properties: {
                title: {
                    bsonType: "string",
                    minLength: 1,
                    maxLength: 200,
                    description: "Blog title - required string between 1-200 characters"
                },
                description: {
                    bsonType: "string",
                    minLength: 1,
                    description: "Blog content - required string"
                },
                author_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "Author user ID - required positive integer"
                },
                images: {
                    bsonType: "array",
                    items: {
                        bsonType: "string"
                    },
                    description: "Array of image URLs"
                },
                likes: {
                    bsonType: "array",
                    items: {
                        bsonType: "int"
                    },
                    description: "Array of user IDs who liked the blog"
                },
                comments: {
                    bsonType: "array",
                    items: {
                        bsonType: "object",
                        required: ["user_id", "text", "created_at"],
                        properties: {
                            user_id: { bsonType: "int" },
                            text: { bsonType: "string", minLength: 1 },
                            created_at: { bsonType: "date" },
                            updated_at: { bsonType: "date" }
                        }
                    },
                    description: "Array of comment objects"
                },
                created_at: {
                    bsonType: "date",
                    description: "Creation timestamp"
                },
                updated_at: {
                    bsonType: "date",
                    description: "Last update timestamp"
                }
            }
        }
    }
});

// Create tours collection with validation
print("Creating tours collection...");
db.createCollection('tours', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "description", "author_id", "status"],
            properties: {
                name: {
                    bsonType: "string",
                    minLength: 1,
                    maxLength: 100,
                    description: "Tour name - required string between 1-100 characters"
                },
                description: {
                    bsonType: "string",
                    minLength: 1,
                    description: "Tour description - required string"
                },
                author_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "Author user ID - required positive integer"
                },
                status: {
                    bsonType: "string",
                    enum: ["draft", "published", "archived"],
                    description: "Tour status - must be draft, published, or archived"
                },
                difficulty: {
                    bsonType: "string",
                    enum: ["easy", "medium", "hard"],
                    description: "Tour difficulty level"
                },
                price: {
                    bsonType: "number",
                    minimum: 0,
                    description: "Tour price - must be >= 0"
                },
                distance_km: {
                    bsonType: "number",
                    minimum: 0,
                    description: "Tour distance in kilometers"
                },
                keypoints: {
                    bsonType: "array",
                    items: {
                        bsonType: "object",
                        required: ["name", "latitude", "longitude"],
                        properties: {
                            name: { bsonType: "string", minLength: 1 },
                            description: { bsonType: "string" },
                            latitude: { bsonType: "number", minimum: -90, maximum: 90 },
                            longitude: { bsonType: "number", minimum: -180, maximum: 180 },
                            images: { bsonType: "array", items: { bsonType: "string" } },
                            order: { bsonType: "int", minimum: 0 }
                        }
                    },
                    description: "Array of tour keypoints with GPS coordinates"
                },
                tags: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "Array of tour tags"
                },
                transport_times: {
                    bsonType: "array",
                    items: {
                        bsonType: "object",
                        required: ["transport_type", "duration_minutes"],
                        properties: {
                            transport_type: { 
                                bsonType: "string", 
                                enum: ["walking", "bicycle", "car"] 
                            },
                            duration_minutes: { bsonType: "int", minimum: 1 }
                        }
                    },
                    description: "Array of transport time estimates"
                },
                reviews: {
                    bsonType: "array",
                    items: {
                        bsonType: "object",
                        required: ["user_id", "rating", "created_at"],
                        properties: {
                            user_id: { bsonType: "int" },
                            rating: { bsonType: "int", minimum: 1, maximum: 5 },
                            comment: { bsonType: "string" },
                            visit_date: { bsonType: "date" },
                            created_at: { bsonType: "date" },
                            images: { bsonType: "array", items: { bsonType: "string" } }
                        }
                    },
                    description: "Array of tour reviews"
                },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" },
                published_at: { bsonType: "date" },
                archived_at: { bsonType: "date" }
            }
        }
    }
});

// Create follows collection
print("Creating follows collection...");
db.createCollection('follows', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["follower_id", "following_id", "created_at"],
            properties: {
                follower_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "ID of the user who is following"
                },
                following_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "ID of the user being followed"
                },
                created_at: {
                    bsonType: "date",
                    description: "When the follow relationship was created"
                }
            }
        }
    }
});

// Create tour executions collection
print("Creating tour_executions collection...");
db.createCollection('tour_executions', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "tour_id", "status", "started_at"],
            properties: {
                user_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "ID of the user executing the tour"
                },
                tour_id: {
                    bsonType: "objectId",
                    description: "MongoDB ObjectId of the tour"
                },
                status: {
                    bsonType: "string",
                    enum: ["active", "completed", "abandoned"],
                    description: "Current status of tour execution"
                },
                current_position: {
                    bsonType: "object",
                    properties: {
                        latitude: { bsonType: "number", minimum: -90, maximum: 90 },
                        longitude: { bsonType: "number", minimum: -180, maximum: 180 },
                        timestamp: { bsonType: "date" }
                    },
                    description: "Current GPS position of the user"
                },
                completed_keypoints: {
                    bsonType: "array",
                    items: {
                        bsonType: "object",
                        required: ["keypoint_index", "completed_at"],
                        properties: {
                            keypoint_index: { bsonType: "int", minimum: 0 },
                            completed_at: { bsonType: "date" },
                            latitude: { bsonType: "number" },
                            longitude: { bsonType: "number" }
                        }
                    },
                    description: "Array of completed keypoints with timestamps"
                },
                started_at: { bsonType: "date" },
                completed_at: { bsonType: "date" },
                abandoned_at: { bsonType: "date" },
                last_activity: { bsonType: "date" }
            }
        }
    }
});

// Create positions collection (for position simulator)
print("Creating positions collection...");
db.createCollection('positions', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "latitude", "longitude", "timestamp"],
            properties: {
                user_id: {
                    bsonType: "int",
                    minimum: 1,
                    description: "User ID for position tracking"
                },
                latitude: {
                    bsonType: "number",
                    minimum: -90,
                    maximum: 90,
                    description: "GPS latitude coordinate"
                },
                longitude: {
                    bsonType: "number",
                    minimum: -180,
                    maximum: 180,
                    description: "GPS longitude coordinate"
                },
                timestamp: {
                    bsonType: "date",
                    description: "When the position was recorded"
                },
                accuracy: {
                    bsonType: "number",
                    minimum: 0,
                    description: "GPS accuracy in meters"
                }
            }
        }
    }
});

// Create indexes for better performance
print("Creating database indexes...");

// Blogs indexes
db.blogs.createIndex({ "author_id": 1 });
db.blogs.createIndex({ "created_at": -1 });
db.blogs.createIndex({ "title": "text", "description": "text" }); // Text search
db.blogs.createIndex({ "likes": 1 }); // For like queries

// Tours indexes
db.tours.createIndex({ "author_id": 1 });
db.tours.createIndex({ "status": 1 });
db.tours.createIndex({ "tags": 1 });
db.tours.createIndex({ "created_at": -1 });
db.tours.createIndex({ "price": 1 });
db.tours.createIndex({ "difficulty": 1 });
db.tours.createIndex({ "name": "text", "description": "text" }); // Text search

// Follows indexes
db.follows.createIndex({ "follower_id": 1, "following_id": 1 }, { unique: true });
db.follows.createIndex({ "follower_id": 1 });
db.follows.createIndex({ "following_id": 1 });

// Tour executions indexes
db.tour_executions.createIndex({ "user_id": 1 });
db.tour_executions.createIndex({ "tour_id": 1 });
db.tour_executions.createIndex({ "status": 1 });
db.tour_executions.createIndex({ "started_at": -1 });

// Positions indexes
db.positions.createIndex({ "user_id": 1 });
db.positions.createIndex({ "timestamp": -1 });
db.positions.createIndex({ "user_id": 1, "timestamp": -1 }); // Compound index

// Insert sample data
print("Inserting sample data...");

// Sample blog post
const sampleBlog = {
    title: "Welcome to SOA Tours",
    description: "This is a sample blog post about our new microservices-based tour platform. We're excited to share amazing travel experiences with you!",
    author_id: 2, // guide1
    images: [],
    likes: [3], // tourist1 liked it
    comments: [
        {
            user_id: 3,
            text: "Great introduction! Looking forward to trying the tours.",
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    created_at: new Date(),
    updated_at: new Date()
};

const blogResult = db.blogs.insertOne(sampleBlog);
print(`Inserted sample blog with ID: ${blogResult.insertedId}`);

// Sample tour
const sampleTour = {
    name: "Historic Downtown Walking Tour",
    description: "Explore the historic downtown area with guided stops at significant landmarks. Perfect for history enthusiasts and casual walkers alike.",
    author_id: 2, // guide1
    status: "published",
    difficulty: "easy",
    price: 15.50,
    distance_km: 2.5,
    keypoints: [
        {
            name: "City Hall",
            description: "Historic city hall building from 1895",
            latitude: 44.8176,
            longitude: 20.4633,
            images: [],
            order: 0
        },
        {
            name: "Main Square",
            description: "Central gathering place with beautiful fountain",
            latitude: 44.8184,
            longitude: 20.4656,
            images: [],
            order: 1
        }
    ],
    tags: ["history", "walking", "downtown", "architecture"],
    transport_times: [
        {
            transport_type: "walking",
            duration_minutes: 45
        }
    ],
    reviews: [
        {
            user_id: 3,
            rating: 5,
            comment: "Amazing tour! The guide was very knowledgeable.",
            visit_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            created_at: new Date(),
            images: []
        }
    ],
    created_at: new Date(),
    updated_at: new Date(),
    published_at: new Date()
};

const tourResult = db.tours.insertOne(sampleTour);
print(`Inserted sample tour with ID: ${tourResult.insertedId}`);

// Sample follow relationship
const sampleFollow = {
    follower_id: 3, // tourist1 follows guide1
    following_id: 2,
    created_at: new Date()
};

db.follows.insertOne(sampleFollow);
print("Inserted sample follow relationship");

// Sample position for tourist
const samplePosition = {
    user_id: 3,
    latitude: 44.8176,
    longitude: 20.4633,
    timestamp: new Date(),
    accuracy: 5.0
};

db.positions.insertOne(samplePosition);
print("Inserted sample position");

// Verify collections and show stats
print("\\n=== MongoDB Initialization Summary ===");
const collections = db.listCollectionNames();
print(`Created ${collections.length} collections: ${collections.join(', ')}`);

collections.forEach(collection => {
    const count = db[collection].countDocuments();
    print(`${collection}: ${count} documents`);
});

print("MongoDB initialization completed successfully!");