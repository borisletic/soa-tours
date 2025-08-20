#!/bin/bash
# SOA Tours Service Health Check Script

echo "🔍 Checking SOA Tours Services..."

services=(
    "mysql:3306"
    "mongodb:27017"  
    "api-gateway:8080"
    "stakeholders-service:8081"
    "content-service:8082"
    "commerce-service:8083"
    "frontend:80"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ $name (port $port) - HEALTHY"
    else
        echo "❌ $name (port $port) - NOT RESPONDING"
    fi
done

echo ""
echo "🧪 Testing Health Endpoints..."

health_endpoints=(
    "http://localhost:8080/health"
    "http://localhost:8081/health"
    "http://localhost:8082/health"
    "http://localhost:8083/health"
)

for endpoint in "${health_endpoints[@]}"; do
    if curl -s -f "$endpoint" > /dev/null; then
        echo "✅ $endpoint - OK"
    else
        echo "❌ $endpoint - FAILED"
    fi
done

echo ""
echo "📊 Container Status:"
docker-compose ps