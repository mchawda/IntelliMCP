# Production Deployment Plan for IntelliMCP Studio

## Overview
This document outlines the complete production deployment strategy for IntelliMCP Studio, a no-code platform for creating Model Context Protocols (MCPs).

## Tech Stack
- **Frontend**: Next.js (Vercel)
- **Backend**: FastAPI Python (Render)
- **Database**: PostgreSQL (Supabase)
- **Vector Store**: ChromaDB (Render Docker)
- **Authentication**: Clerk (Production Keys)
- **AI Services**: OpenAI API

## Phase 1: Code Modifications for Production

### 1.1 Backend Modifications

#### Create Vector Store Service
```python
# backend/vector_store_services.py
import os
from functools import lru_cache
import chromadb
from chromadb.config import Settings

@lru_cache(maxsize=1)
def get_vector_store():
    """Get or create ChromaDB client with production configuration."""
    chroma_host = os.getenv("CHROMA_HOST")
    chroma_port = os.getenv("CHROMA_PORT", "8000")
    
    if chroma_host:
        # Production: Connect to remote ChromaDB server
        return chromadb.HttpClient(
            host=chroma_host,
            port=int(chroma_port),
            settings=Settings(anonymized_telemetry=False)
        )
    else:
        # Development: Use local persistent storage
        return chromadb.PersistentClient(
            path="./chroma_data",
            settings=Settings(anonymized_telemetry=False)
        )
```

#### Update Database Configuration
```python
# backend/database.py - Add DATABASE_URL support
import os
from sqlmodel import create_engine, SQLModel, Session

# Priority: Use DATABASE_URL if available, otherwise construct from parts
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    db_user = os.getenv("DB_USER", "devuser")
    db_password = os.getenv("DB_PASSWORD", "devpassword")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "intellimcp_dev")
    DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL, echo=False)
```

#### Update CORS Configuration
```python
# backend/main.py - Production CORS settings
from fastapi.middleware.cors import CORSMiddleware

# Production origins
origins = [
    "https://intellimcp.vercel.app",  # Your Vercel production URL
    "https://www.intellimcp.co",      # Your custom domain (if any)
]

# Add development origins only in dev mode
if os.getenv("ENVIRONMENT", "production") == "development":
    origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 1.2 Frontend Modifications

#### Environment Configuration
```bash
# frontend/.env.production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
CLERK_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET
NEXT_PUBLIC_BACKEND_API_URL=https://intellimcp-backend.onrender.com
```

### 1.3 Database Migrations Setup

#### Install Alembic
```bash
cd backend
pip install alembic
alembic init alembic
```

#### Configure Alembic
```python
# backend/alembic/env.py
from sqlmodel import SQLModel
from database import DATABASE_URL
from models import *  # Import all models

# Set the database URL
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Set the target metadata
target_metadata = SQLModel.metadata
```

## Phase 2: Infrastructure Setup

### 2.1 Supabase (Database)
1. Create account at supabase.com
2. Create new project "intellimcp-prod"
3. Save connection string: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
4. Enable Row Level Security (RLS) for production tables

### 2.2 Render (Backend + ChromaDB)

#### Backend Service Setup
1. Create Web Service on Render
2. Connect GitHub repository (backend directory)
3. Configuration:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Environment Variables**:
     ```
     DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
     CLERK_SECRET_KEY=sk_live_YOUR_KEY
     OPENAI_API_KEY=sk-YOUR_KEY
     CHROMA_HOST=chroma-db  # Internal service name
     CHROMA_PORT=8000
     ENVIRONMENT=production
     ```

#### ChromaDB Docker Service
1. Create Private Service on Render
2. Use Docker deployment
3. Dockerfile:
   ```dockerfile
   FROM chromadb/chroma:latest
   EXPOSE 8000
   VOLUME ["/chroma/chroma"]
   CMD ["--path", "/chroma/chroma", "--host", "0.0.0.0", "--port", "8000"]
   ```
4. Attach Persistent Disk (10GB) mounted at `/chroma/chroma`

### 2.3 Vercel (Frontend)
1. Import repository on Vercel
2. Set root directory to `frontend`
3. Environment Variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY
   CLERK_SECRET_KEY=sk_live_YOUR_KEY
   NEXT_PUBLIC_BACKEND_API_URL=https://intellimcp-backend.onrender.com
   ```

## Phase 3: Security & Production Hardening

### 3.1 Authentication Security
```python
# backend/auth_utils.py - Implement proper JWKS validation
import jwt
from jwt import PyJWKClient

@lru_cache(maxsize=1)
def get_jwks_client():
    """Get cached JWKS client for Clerk"""
    clerk_issuer = os.getenv("CLERK_ISSUER", "https://clerk.YOUR_DOMAIN")
    return PyJWKClient(f"{clerk_issuer}/.well-known/jwks.json")

def verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT with proper JWKS validation"""
    client = get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=os.getenv("CLERK_AUDIENCE"),
        issuer=os.getenv("CLERK_ISSUER")
    )
```

### 3.2 Rate Limiting
```python
# backend/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# Apply to sensitive endpoints
@app.post("/generate/mcp/{mcp_id}")
@limiter.limit("10/minute")
async def generate_mcp(mcp_id: str, request: Request):
    # ... existing code
```

### 3.3 Logging & Monitoring
```python
# backend/logging_config.py
import logging
import json
from pythonjsonlogger import jsonlogger

def setup_logging():
    """Configure structured JSON logging for production"""
    logHandler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter()
    logHandler.setFormatter(formatter)
    
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(logHandler)
    
    return logger

# Use in main.py
logger = setup_logging()
```

## Phase 4: CI/CD Pipeline

### 4.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest
      - name: Run tests
        run: |
          cd backend
          pytest

  deploy:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

## Phase 5: Monitoring & Maintenance

### 5.1 Health Checks
```python
# backend/main.py
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database
        async with get_session() as session:
            await session.execute("SELECT 1")
        
        # Check vector store
        vector_store = get_vector_store()
        vector_store.heartbeat()
        
        return {"status": "healthy", "timestamp": datetime.utcnow()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}, 503
```

### 5.2 Error Tracking (Sentry)
```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "production"),
    traces_sample_rate=0.1,
)

app.add_middleware(SentryAsgiMiddleware)
```

## Phase 6: Backup & Disaster Recovery

### 6.1 Database Backups
- Supabase provides automatic daily backups
- Configure point-in-time recovery (7 days retention)
- Set up weekly manual backup exports to S3

### 6.2 Vector Store Backups
```bash
# backup-chromadb.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf chromadb_backup_$TIMESTAMP.tar.gz /chroma/chroma
aws s3 cp chromadb_backup_$TIMESTAMP.tar.gz s3://intellimcp-backups/chromadb/
```

## Phase 7: Scaling Considerations

### 7.1 Horizontal Scaling
- **Frontend**: Vercel handles auto-scaling
- **Backend**: Increase Render instance count and worker processes
- **Database**: Upgrade Supabase plan for more connections/resources
- **Vector Store**: Consider managed solutions (Pinecone, Weaviate) for scale

### 7.2 Performance Optimization
```python
# backend/caching.py
from functools import lru_cache
import redis

redis_client = redis.from_url(os.getenv("REDIS_URL"))

def cache_mcp_definition(mcp_id: str, definition: dict, ttl=3600):
    """Cache MCP definitions in Redis"""
    redis_client.setex(
        f"mcp:{mcp_id}:definition",
        ttl,
        json.dumps(definition)
    )
```

## Deployment Checklist

### Pre-deployment
- [ ] Set up Supabase project and get connection string
- [ ] Create Clerk production instance and get keys
- [ ] Set up Render account and create services
- [ ] Configure Vercel project
- [ ] Update all environment variables
- [ ] Run database migrations with Alembic
- [ ] Test all integrations in staging environment

### Deployment
- [ ] Deploy backend to Render
- [ ] Deploy ChromaDB Docker container
- [ ] Deploy frontend to Vercel
- [ ] Verify health checks pass
- [ ] Test critical user flows

### Post-deployment
- [ ] Set up monitoring alerts
- [ ] Configure backup schedules
- [ ] Document deployment process
- [ ] Create runbooks for common issues
- [ ] Set up on-call rotation

## Cost Estimates (Monthly)
- **Vercel**: Free tier (sufficient for start)
- **Render**: 
  - Backend: ~$25 (Starter+ instance)
  - ChromaDB: ~$19 (with persistent disk)
- **Supabase**: Free tier (up to 500MB database)
- **Total**: ~$44/month initially

## Next Steps
1. Create accounts on all platforms
2. Set up infrastructure following this guide
3. Configure CI/CD pipeline
4. Perform security audit
5. Launch with beta users
6. Monitor and iterate based on usage 