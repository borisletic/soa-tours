FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and source together
COPY go.mod ./
COPY . .

# Download dependencies and tidy
RUN go mod download
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o commerce main.go

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates wget
WORKDIR /root/

COPY --from=builder /app/commerce .

EXPOSE 8083
CMD ["./commerce"]