# 🐳 IntelliMCP Studio Enterprise Docker Quickstart

## 🚀 **Enterprise Docker Setup**

This guide will help you set up the complete IntelliMCP Studio enterprise environment using Docker containers.

## 📋 **Prerequisites**

- ✅ Docker Desktop installed and running
- ✅ Docker Compose available
- ✅ OpenAI API key
- ✅ Clerk authentication keys

## 🎯 **Quick Start (3 Steps)**

### **Step 1: Start the Enterprise System**
```bash
# Run the enterprise startup script
./start-docker.sh
```

### **Step 2: Configure Environment Variables**
The script will create a `.env` file. Update it with your API keys:

```bash
# Edit the environment file
nano .env
```

**Required Variables:**
```env
# OpenAI API Key (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Clerk Authentication (Required)
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
```

### **Step 3: Access the Enterprise System**
Once all services are running, access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/docs
- **Health Check**: http://localhost:8080/health
- **Metrics**: http://localhost:8080/metrics

## 🏗️ **Enterprise Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Database)    │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   ChromaDB      │
                       │   (Vector DB)   │
                       │   Port: 8000    │
                       └─────────────────┘
```

## 🔧 **Docker Services**

### **Core Services**
- **postgres**: Enterprise PostgreSQL database
- **chromadb**: Vector database for embeddings
- **backend**: FastAPI application with 4 workers
- **frontend**: Next.js application with Turbopack

### **Optional Services**
- **redis**: Caching layer (for future use)
- **nginx**: Reverse proxy (for production)

## 📊 **Enterprise Features**

### **Performance Optimizations**
- ✅ **Multi-worker backend** (4 workers)
- ✅ **Connection pooling** (20 base + 30 overflow)
- ✅ **GZip compression** for responses
- ✅ **Health checks** for all services
- ✅ **Prometheus metrics** integration

### **Monitoring & Observability**
- ✅ **Real-time metrics** at `/metrics`
- ✅ **Health endpoints** for load balancers
- ✅ **Structured logging** with timestamps
- ✅ **Performance monitoring** middleware

### **Security Features**
- ✅ **Non-root containers** for security
- ✅ **Environment variable** management
- ✅ **Network isolation** with Docker networks
- ✅ **Health checks** for service reliability

## 🛠️ **Management Commands**

### **Start Services**
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
```

### **Stop Services**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### **View Logs**
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### **Monitor Services**
```bash
# Check service status
docker-compose ps

# Check resource usage
docker stats
```

### **Rebuild Services**
```bash
# Rebuild all services
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache backend
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8080
lsof -i :5432
lsof -i :8000

# Stop conflicting services
sudo lsof -ti:3000 | xargs kill -9
```

#### **2. Docker Resource Issues**
```bash
# Check Docker resources
docker system df

# Clean up Docker
docker system prune -a
docker volume prune
```

#### **3. Service Health Issues**
```bash
# Check service health
docker-compose ps

# Restart specific service
docker-compose restart backend

# View service logs
docker-compose logs backend
```

#### **4. Database Connection Issues**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Connect to PostgreSQL
docker-compose exec postgres psql -U devuser -d intellimcp_dev
```

### **Performance Monitoring**

#### **Check API Performance**
```bash
# Test health endpoint
curl http://localhost:8080/health

# Test metrics endpoint
curl http://localhost:8080/metrics

# Load test (install Apache Bench first)
ab -n 1000 -c 10 http://localhost:8080/health
```

#### **Monitor Resource Usage**
```bash
# Real-time resource monitoring
docker stats

# Check container logs
docker-compose logs -f --tail=100
```

## 🚀 **Production Deployment**

### **Environment Variables for Production**
```env
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
CHROMA_HOST=your-chromadb-host
CHROMA_PORT=8000
```

### **Docker Compose Override**
```bash
# Create production override
cp docker-compose.yml docker-compose.prod.yml

# Edit for production settings
nano docker-compose.prod.yml
```

### **SSL/HTTPS Setup**
```bash
# Add SSL certificates
mkdir -p nginx/ssl
# Add your SSL certificates to nginx/ssl/
```

## 📈 **Enterprise Metrics**

### **Key Performance Indicators**
- **Response Time**: < 500ms (P95)
- **Error Rate**: < 1%
- **Uptime**: > 99.9%
- **Database Connections**: < 80% utilization

### **Monitoring Endpoints**
- **Health**: `GET /health`
- **Metrics**: `GET /metrics`
- **API Docs**: `GET /docs`
- **OpenAPI**: `GET /openapi.json`

## 🔄 **Development Workflow**

### **Local Development**
```bash
# Start development environment
./start-docker.sh

# Make code changes
# Services will auto-reload

# View logs in real-time
docker-compose logs -f
```

### **Testing**
```bash
# Run backend tests
docker-compose exec backend python -m pytest

# Run frontend tests
docker-compose exec frontend npm test
```

## 📚 **Additional Resources**

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs

---

**Enterprise Support**: For additional enterprise features and support, contact the development team.

**🎯 Ready to start? Run `./start-docker.sh` to launch your enterprise IntelliMCP Studio!** 