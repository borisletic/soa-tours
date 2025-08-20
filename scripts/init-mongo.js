// Switch to the soa_tours_content database
db = db.getSiblingDB('soa_tours_content');

// Create collections with validation
db.createCollection('blogs', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["title", "description", "author_id", "created_at"],
         properties: {
            title: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            description: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            author_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            },
            images: {
               bsonType: "array",
               description: "must be an array"
            },
            likes: {
               bsonType: "array",
               description: "must be an array of user IDs"
            },
            comments: {
               bsonType: "array",
               description: "must be an array of comment objects"
            }
         }
      }
   }
});

db.createCollection('tours', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["name", "description", "author_id", "status"],
         properties: {
            name: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            description: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            author_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            },
            status: {
               bsonType: "string",
               enum: ["draft", "published", "archived"],
               description: "must be one of the enum values"
            },
            difficulty: {
               bsonType: "string",
               enum: ["easy", "medium", "hard"],
               description: "must be one of the enum values"
            },
            price: {
               bsonType: "number",
               minimum: 0,
               description: "must be a number >= 0"
            },
            keypoints: {
               bsonType: "array",
               description: "must be an array of keypoint objects"
            },
            tags: {
               bsonType: "array",
               description: "must be an array of strings"
            },
            transport_times: {
               bsonType: "array",
               description: "must be an array of transport time objects"
            },
            reviews: {
               bsonType: "array",
               description: "must be an array of review objects"
            }
         }
      }
   }
});

db.createCollection('follows', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["follower_id", "following_id", "created_at"],
         properties: {
            follower_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            },
            following_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            }
         }
      }
   }
});

db.createCollection('tour_executions', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["user_id", "tour_id", "status", "started_at"],
         properties: {
            user_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            },
            tour_id: {
               bsonType: "objectId",
               description: "must be an ObjectId and is required"
            },
            status: {
               bsonType: "string",
               enum: ["active", "completed", "abandoned"],
               description: "must be one of the enum values"
            },
            current_position: {
               bsonType: "object",
               properties: {
                  latitude: { bsonType: "number" },
                  longitude: { bsonType: "number" }
               }
            },
            completed_keypoints: {
               bsonType: "array",
               description: "must be an array of completed keypoint objects"
            }
         }
      }
   }
});

db.createCollection('positions', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["user_id", "latitude", "longitude", "timestamp"],
         properties: {
            user_id: {
               bsonType: "int",
               description: "must be an integer and is required"
            },
            latitude: {
               bsonType: "number",
               minimum: -90,
               maximum: 90,
               description: "must be a number between -90 and 90"
            },
            longitude: {
               bsonType: "number",
               minimum: -180,
               maximum: 180,
               description: "must be a number between -180 and 180"
            }
         }
      }
   }
});

// Create indexes for better performance
db.blogs.createIndex({ "author_id": 1 });
db.blogs.createIndex({ "created_at": -1 });
db.tours.createIndex({ "author_id": 1 });
db.tours.createIndex({ "status": 1 });
db.tours.createIndex({ "tags": 1 });
db.follows.createIndex({ "follower_id": 1, "following_id": 1 }, { unique: true });
db.tour_executions.createIndex({ "user_id": 1 });
db.tour_executions.createIndex({ "tour_id": 1 });
db.positions.createIndex({ "user_id": 1 });
db.positions.createIndex({ "timestamp": -1 });

print("MongoDB initialization completed successfully!");