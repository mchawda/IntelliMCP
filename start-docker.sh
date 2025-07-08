#!/bin/bash

# Enterprise IntelliMCP Studio Docker Startup Script
# Features: Container orchestration, health monitoring, and enterprise deployment

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if Docker is running
check_docker() {
    log "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log "Docker is running"
}

# Check if Docker Compose is available
check_docker_compose() {
    log "Checking Docker Compose..."
    if ! docker-compose --version > /dev/null 2>&1; then
        error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    log "Docker Compose is available"
}

# Create environment file if it doesn't exist
create_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log "Creating environment file..."
        cat > "$ENV_FILE" << EOF
# IntelliMCP Studio Environment Variables
# Add your API keys and configuration here

# OpenAI API Key (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Clerk Authentication (Required)
CLERK_SECRET_KEY=your_clerk_secret_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# Database Configuration
DATABASE_URL=postgresql://devuser:devpassword@postgres:5432/intellimcp_dev

# ChromaDB Configuration
CHROMA_HOST=chromadb
CHROMA_PORT=8000

# Application Configuration
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
EOF
        warning "Environment file created. Please update with your API keys."
    else
        log "Environment file exists"
    fi
}

# Check environment variables
check_env_vars() {
    log "Checking environment variables..."
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found. Please run the script again to create it."
        exit 1
    fi
    
    # Source the environment file
    source "$ENV_FILE"
    
    # Check required variables
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        error "OPENAI_API_KEY is not set. Please update your .env file."
        exit 1
    fi
    
    if [ -z "$CLERK_SECRET_KEY" ] || [ "$CLERK_SECRET_KEY" = "your_clerk_secret_key_here" ]; then
        error "CLERK_SECRET_KEY is not set. Please update your .env file."
        exit 1
    fi
    
    if [ -z "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ] || [ "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" = "your_clerk_publishable_key_here" ]; then
        error "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Please update your .env file."
        exit 1
    fi
    
    log "Environment variables are properly configured"
}

# Clean up existing containers
cleanup() {
    log "Cleaning up existing containers..."
    docker-compose down --remove-orphans 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
}

# Build and start services
start_services() {
    log "Building and starting enterprise services..."
    
    # Build images
    log "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    log "Services started successfully"
}

# Health check function
health_check() {
    local service=$1
    local max_attempts=60
    local attempt=1
    
    log "Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "Up"; then
            log "$service is ready!"
            return 0
        fi
        sleep 5
        attempt=$((attempt + 1))
    done
    error "$service failed to start after $max_attempts attempts"
    return 1
}

# Display service status
show_status() {
    log "=== Enterprise Service Status ==="
    docker-compose ps
    
    log "=== Service URLs ==="
    log "Frontend: http://localhost:3000"
    log "Backend API: http://localhost:8080"
    log "API Documentation: http://localhost:8080/docs"
    log "Health Check: http://localhost:8080/health"
    log "Metrics: http://localhost:8080/metrics"
    log "ChromaDB: http://localhost:8000"
    log "PostgreSQL: localhost:5432"
    log "================================="
}

# Monitor logs
monitor_logs() {
    log "Monitoring service logs..."
    docker-compose logs -f
}

# Main execution
main() {
    log "Starting IntelliMCP Studio Enterprise Edition with Docker..."
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Setup environment
    create_env_file
    check_env_vars
    
    # Cleanup and start
    cleanup
    start_services
    
    # Wait for services to be ready
    health_check "postgres"
    health_check "chromadb"
    health_check "backend"
    health_check "frontend"
    
    # Display status
    show_status
    
    log "Enterprise system is ready!"
    log "Use 'docker-compose logs -f' to monitor logs"
    log "Use 'docker-compose down' to stop services"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@" 