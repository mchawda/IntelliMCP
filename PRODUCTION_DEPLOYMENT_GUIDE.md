# MCPMaker Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying MCPMaker to production environments. The application has been enhanced with enterprise-grade features including team collaboration, version control, and marketplace functionality.

## Architecture Overview

### System Components
- **Frontend**: Next.js 14 application with TypeScript
- **Backend**: FastAPI with Python
- **Database**: PostgreSQL with Prisma ORM
- **Vector Store**: ChromaDB for semantic search
- **Authentication**: Clerk for user management
- **AI Services**: OpenAI API integration
- **File Storage**: Cloud storage for document uploads

### New Features Added
- **Team Collaboration**: Role-based access control and team management
- **Version Control**: Complete MCP version tracking and comparison
- **Marketplace**: Public MCP sharing and discovery
- **Advanced UI**: Framer Motion animations and modern design
- **Enhanced Validation**: Multi-criteria MCP assessment
- **Export System**: Multi-format export capabilities

## Prerequisites

### System Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB+ SSD storage
- **Network**: Stable internet connection for AI services

### Software Requirements
- **Docker**: 20.10+ with Docker Compose
- **Node.js**: 18.17+ LTS
- **Python**: 3.11+
- **PostgreSQL**: 15+
- **Redis**: 7+ (for caching)

### External Services
- **OpenAI API**: GPT-4 access for AI features
- **Clerk**: Authentication service
- **Cloud Storage**: AWS S3 or equivalent for file storage

## Environment Configuration

### Frontend Environment Variables
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=https://api.yourdomain.com

# OpenAI Configuration
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Vector Database
NEXT_PUBLIC_VECTOR_DB_URL=https://chromadb.yourdomain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_MARKETPLACE=true
NEXT_PUBLIC_ENABLE_TEAMS=true
NEXT_PUBLIC_ENABLE_VERSION_CONTROL=true
```

### Backend Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mcpmaker

# Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Vector Database
CHROMA_DB_HOST=localhost
CHROMA_DB_PORT=8000
CHROMA_DB_COLLECTION=mcpmaker-embeddings

# File Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Feature Flags
ENABLE_MARKETPLACE=true
ENABLE_TEAMS=true
ENABLE_VERSION_CONTROL=true
ENABLE_EXPORT=true
```

## Docker Deployment

### Updated Docker Compose Configuration
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BACKEND_API_URL=http://backend:8080
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
    depends_on:
      - backend
    networks:
      - mcpmaker-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://mcpmaker:password@postgres:5432/mcpmaker
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - chromadb
      - redis
    networks:
      - mcpmaker-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=mcpmaker
      - POSTGRES_USER=mcpmaker
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - mcpmaker-network

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    networks:
      - mcpmaker-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mcpmaker-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - mcpmaker-network

volumes:
  postgres_data:
  chroma_data:
  redis_data:

networks:
  mcpmaker-network:
    driver: bridge
```

### Nginx Configuration
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8080;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Vector Database
        location /chroma/ {
            proxy_pass http://chromadb:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Database Setup

### PostgreSQL Schema Updates
```sql
-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Version control table
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcp_id UUID REFERENCES mcps(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    changes JSONB,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_latest BOOLEAN DEFAULT false
);

-- Marketplace items table
CREATE TABLE marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcp_id UUID REFERENCES mcps(id) ON DELETE CASCADE,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    category VARCHAR(100),
    tags TEXT[]
);

-- Add indexes for performance
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_versions_mcp_id ON versions(mcp_id);
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX idx_marketplace_items_featured ON marketplace_items(featured);
```

## Security Configuration

### SSL/TLS Setup
```bash
# Generate SSL certificate (Let's Encrypt)
sudo certbot certonly --nginx -d yourdomain.com

# Copy certificates to nginx
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
```

### Security Headers
```nginx
# Add to nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## Monitoring and Logging

### Application Monitoring
```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - mcpmaker-network

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - mcpmaker-network
```

### Log Aggregation
```yaml
# Add to docker-compose.yml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - mcpmaker-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - mcpmaker-network
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQL backup
docker exec mcpmaker_postgres_1 pg_dump -U mcpmaker mcpmaker > $BACKUP_DIR/db_backup_$DATE.sql

# ChromaDB backup
docker exec mcpmaker_chromadb_1 tar -czf - /chroma/chroma > $BACKUP_DIR/chroma_backup_$DATE.tar.gz

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql s3://your-backup-bucket/
aws s3 cp $BACKUP_DIR/chroma_backup_$DATE.tar.gz s3://your-backup-bucket/
```

### Automated Backup Cron Job
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Performance Optimization

### Caching Strategy
```python
# Redis caching configuration
import redis
from functools import wraps

redis_client = redis.Redis(host='redis', port=6379, db=0)

def cache_result(expire_time=3600):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            cached_result = redis_client.get(cache_key)
            
            if cached_result:
                return json.loads(cached_result)
            
            result = func(*args, **kwargs)
            redis_client.setex(cache_key, expire_time, json.dumps(result))
            return result
        return wrapper
    return decorator
```

### Database Optimization
```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_mcps_owner_id ON mcps(owner_id);
CREATE INDEX CONCURRENTLY idx_mcps_created_at ON mcps(created_at);
CREATE INDEX CONCURRENTLY idx_mcps_domain ON mcps(domain);
CREATE INDEX CONCURRENTLY idx_mcps_tags ON mcps USING GIN(tags);

-- Partition large tables
CREATE TABLE mcps_partitioned (
    LIKE mcps INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE mcps_2024 PARTITION OF mcps_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database schema updated
- [ ] External services configured (Clerk, OpenAI)
- [ ] Cloud storage configured
- [ ] Monitoring tools set up

### Deployment Steps
1. **Build and push Docker images**
   ```bash
   docker-compose build
   docker-compose push
   ```

2. **Deploy to production**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec backend python -m alembic upgrade head
   ```

4. **Verify deployment**
   ```bash
   curl -I https://yourdomain.com
   curl -I https://yourdomain.com/api/health
   ```

### Post-deployment
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Database connections working
- [ ] AI services responding
- [ ] File uploads working
- [ ] Team features functional
- [ ] Version control operational
- [ ] Marketplace accessible

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   docker-compose exec postgres psql -U mcpmaker -d mcpmaker -c "SELECT 1;"
   ```

2. **ChromaDB Issues**
   ```bash
   # Restart ChromaDB
   docker-compose restart chromadb
   ```

3. **Memory Issues**
   ```bash
   # Monitor resource usage
   docker stats
   ```

4. **SSL Certificate Issues**
   ```bash
   # Renew certificates
   sudo certbot renew
   ```

### Log Analysis
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check nginx logs
docker-compose logs -f nginx
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer for multiple backend instances
- Implement Redis cluster for session management
- Consider database read replicas for heavy read loads

### Vertical Scaling
- Monitor resource usage and scale accordingly
- Implement auto-scaling based on metrics
- Use CDN for static asset delivery

## Maintenance

### Regular Maintenance Tasks
- Database vacuum and analyze
- Log rotation and cleanup
- SSL certificate renewal
- Security updates
- Performance monitoring review

### Update Procedures
1. Create backup before updates
2. Test updates in staging environment
3. Deploy during maintenance window
4. Monitor system health post-update
5. Rollback plan if issues arise

## Support and Documentation

### Monitoring Dashboards
- Application metrics in Grafana
- Error tracking with Sentry
- Performance monitoring with New Relic

### Documentation
- API documentation with Swagger
- User guides for new features
- Developer documentation
- Troubleshooting guides

This updated deployment guide includes all the new enterprise features and provides comprehensive instructions for production deployment of the enhanced MCPMaker platform. 