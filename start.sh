#!/bin/bash

# Enterprise IntelliMCP Studio Startup Script
# Features: Process management, monitoring, health checks, and performance optimization

set -e  # Exit on any error

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
LOG_DIR="./logs"
PID_DIR="./pids"

# Create directories
mkdir -p $LOG_DIR $PID_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if PostgreSQL is running
check_postgres() {
    log "Checking PostgreSQL connection..."
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        error "PostgreSQL is not running. Starting PostgreSQL..."
        if command -v brew > /dev/null 2>&1; then
            brew services start postgresql@14 || brew services start postgresql
        elif command -v systemctl > /dev/null 2>&1; then
            sudo systemctl start postgresql
        else
            error "PostgreSQL not found. Please install and start PostgreSQL manually."
            exit 1
        fi
        sleep 3
    fi
    log "PostgreSQL is running"
}

# Kill existing processes
cleanup() {
    log "Cleaning up existing processes..."
    if [ -f "$PID_DIR/backend.pid" ]; then
        kill -TERM $(cat "$PID_DIR/backend.pid") 2>/dev/null || true
        rm -f "$PID_DIR/backend.pid"
    fi
    if [ -f "$PID_DIR/frontend.pid" ]; then
        kill -TERM $(cat "$PID_DIR/frontend.pid") 2>/dev/null || true
        rm -f "$PID_DIR/frontend.pid"
    fi
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log "$service is ready!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    error "$service failed to start after $max_attempts attempts"
    return 1
}

# Start backend with enterprise configuration
start_backend() {
    log "Starting backend (FastAPI/Uvicorn) with enterprise configuration..."
    cd backend
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Start with multiple workers for enterprise load
    nohup python -m uvicorn main:app \
        --host 0.0.0.0 \
        --port $BACKEND_PORT \
        --workers 4 \
        --loop uvloop \
        --http httptools \
        --log-level info \
        --access-log \
        --reload > "../$LOG_DIR/backend.log" 2>&1 &
    
    BACKEND_PID=$!
    echo $BACKEND_PID > "../$PID_DIR/backend.pid"
    cd ..
    
    log "Backend started with PID: $BACKEND_PID"
}

# Start frontend with enterprise configuration
start_frontend() {
    log "Starting frontend (Next.js) with enterprise configuration..."
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
    fi
    
    # Start with Turbopack for enterprise performance
    nohup npm run dev > "../$LOG_DIR/frontend.log" 2>&1 &
    
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$PID_DIR/frontend.pid"
    cd ..
    
    log "Frontend started with PID: $FRONTEND_PID"
}

# Main execution
main() {
    log "Starting IntelliMCP Studio Enterprise Edition..."
    
    # Cleanup existing processes
    cleanup
    
    # Check PostgreSQL
    check_postgres
    
    # Start backend
    start_backend
    
    # Start frontend
    start_frontend
    
    # Wait for services to be ready
    health_check "Backend" "http://localhost:$BACKEND_PORT/health"
    health_check "Frontend" "http://localhost:$FRONTEND_PORT"
    
    # Display status
    log "=== IntelliMCP Studio Enterprise Edition Started ==="
    log "Backend: http://localhost:$BACKEND_PORT"
    log "Frontend: http://localhost:$FRONTEND_PORT"
    log "API Docs: http://localhost:$BACKEND_PORT/docs"
    log "Metrics: http://localhost:$BACKEND_PORT/metrics"
    log "Logs: $LOG_DIR/"
    log "PIDs: $PID_DIR/"
    log "=================================================="
    
    # Save process info
    echo "Backend PID: $BACKEND_PID" > start.log
    echo "Frontend PID: $FRONTEND_PID" >> start.log
    echo "Started at: $(date)" >> start.log
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@" 