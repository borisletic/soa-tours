# SOA Tours - Quick Start

## Prerequisites
- Docker and Docker Compose installed
- Ports 3306, 27017, 8080-8083, 4200 available

## Starting the Application
1. Clone the repository
2. Navigate to the project root: `cd soa-tours`
3. Start all services: `docker-compose up -d`
4. Wait for all services to be healthy: `docker-compose ps`
5. Access the application: http://localhost:4200

## Service URLs
- Frontend: http://localhost:4200
- API Gateway: http://localhost:8080
- Stakeholders Service: http://localhost:8081
- Content Service: http://localhost:8082
- Commerce Service: http://localhost:8083

## Stopping the Application
```bash
docker-compose down -v  # -v removes volumes (data)