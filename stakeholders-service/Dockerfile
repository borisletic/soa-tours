FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and source
COPY go.mod ./
COPY . .

# Download dependencies and tidy (this creates proper go.sum)
RUN go mod download
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o stakeholders main.go

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates wget curl
WORKDIR /root/

COPY --from=builder /app/stakeholders .

EXPOSE 8081
CMD ["./stakeholders"]