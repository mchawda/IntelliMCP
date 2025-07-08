from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import time
import logging
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Import database functions
from database import create_db_and_tables

# Import the new router
from routers import ingestion, mcp, context, generation, ai_assistance, validation, prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    logger.info("FastAPI application starting up...")
    try:
        create_db_and_tables() # Call the function to create DB tables
        logger.info("Database initialization successful")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    yield
    # Code to run on shutdown (if needed)
    logger.info("FastAPI application shutting down...")

app = FastAPI(
    title="IntelliMCP Studio API",
    description="Enterprise API for managing MCP creation, validation, and more.",
    version="1.0.0",
    lifespan=lifespan
)

# Add enterprise middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS Configuration - Define specific origins
# In Production, replace localhost with your actual deployed frontend URL
# e.g., "https://your-app-name.vercel.app"
origins = [
    "http://localhost:3000",      # Local Next.js dev server
    "http://127.0.0.1:3000",     # Alternative local Next.js dev server
    "https://your-vercel-prod-url.vercel.app", # <-- REPLACE THIS in production
    "https://your-vercel-preview-url.vercel.app", # <-- Optional: For preview deploys
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Keep True if you rely on cookies/auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE"], # Be more specific than "*"
    allow_headers=["Authorization", "Content-Type"], # List specific needed headers
)

# Performance monitoring middleware
@app.middleware("http")
async def performance_monitoring(request: Request, call_next):
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate metrics
    duration = time.time() - start_time
    REQUEST_LATENCY.observe(duration)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    # Add performance headers
    response.headers["X-Response-Time"] = str(duration)
    
    return response

# Include the routers
app.include_router(ingestion.router)
app.include_router(mcp.router)
app.include_router(context.router)
app.include_router(generation.router)
app.include_router(ai_assistance.router)
app.include_router(validation.router)
app.include_router(prompt.router)

@app.get("/")
async def read_root():
    return {"message": "IntelliMCP Studio Enterprise API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Enterprise health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# To run the backend:
# Navigate to the backend directory in your terminal
# Ensure the virtual environment is active: source venv/bin/activate
# Run: uvicorn main:app --reload --workers 4 