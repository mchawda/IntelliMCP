# MCPMaker Hostinger Deployment Guide

## Domain: www.intellimcp.co

### 🚀 **Step 1: Hostinger VPS Setup**

1. **Purchase VPS Plan**
   - Minimum: 2GB RAM, 20GB SSD
   - Recommended: 4GB RAM, 40GB SSD
   - OS: Ubuntu 20.04/22.04

2. **Connect to VPS**
   ```bash
   ssh root@your-vps-ip
   ```

### 🛠 **Step 2: Server Environment Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+
sudo apt install python3 python3-pip python3-venv -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

### 🗄 **Step 3: Database Setup**

```bash
# Create database user
sudo -u postgres createuser --interactive
# Enter: mcpmaker
# Answer: y (superuser)

# Create database
sudo -u postgres createdb mcpmaker

# Set password
sudo -u postgres psql
ALTER USER mcpmaker PASSWORD 'your-secure-password';
\q
```

### 📁 **Step 4: Application Deployment**

```bash
# Create application directory
sudo mkdir -p /var/www/mcpmaker
sudo chown $USER:$USER /var/www/mcpmaker

# Clone your repository
cd /var/www/mcpmaker
git clone https://github.com/your-username/mcpmaker.git .

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
npm run build
```

### ⚙ **Step 5: Environment Configuration**

```bash
# Create environment files
sudo nano /var/www/mcpmaker/backend/.env
```

**Backend .env:**
```env
DATABASE_URL=postgresql://mcpmaker:your-secure-password@localhost/mcpmaker
OPENAI_API_KEY=your-openai-key
VECTOR_DB_URL=http://localhost:8000
NODE_ENV=production
```

```bash
sudo nano /var/www/mcpmaker/frontend/.env.local
```

**Frontend .env.local:**
```env
NEXT_PUBLIC_API_URL=https://www.intellimcp.co/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

### 🔧 **Step 6: PM2 Process Management**

```bash
# Create PM2 ecosystem file
cd /var/www/mcpmaker
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'mcpmaker-backend',
      cwd: '/var/www/mcpmaker/backend',
      script: 'uvicorn',
      args: 'main:app --host 127.0.0.1 --port 8080',
      interpreter: '/var/www/mcpmaker/backend/venv/bin/python',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'mcpmaker-frontend',
      cwd: '/var/www/mcpmaker/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

```bash
# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 🌐 **Step 7: Nginx Configuration**

```bash
sudo nano /etc/nginx/sites-available/intellimcp.co
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name www.intellimcp.co intellimcp.co;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/intellimcp.co /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 🔒 **Step 8: SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d www.intellimcp.co -d intellimcp.co
```

### 🚀 **Step 9: Final Steps**

```bash
# Test applications
curl http://localhost:3000
curl http://localhost:8080/health

# Monitor logs
pm2 logs
pm2 monit
```

### 📊 **Monitoring & Maintenance**

```bash
# View application status
pm2 status

# Restart applications
pm2 restart all

# Update application
cd /var/www/mcpmaker
git pull
cd frontend && npm run build
pm2 restart all
```

## 🌐 **Domain Configuration**

### **Hostinger DNS Settings:**
- **A Record**: @ → Your VPS IP
- **A Record**: www → Your VPS IP
- **CNAME**: api → www.intellimcp.co

### **SSL Certificate:**
- Automatically managed by Let's Encrypt
- Auto-renewal configured

## 💰 **Estimated Costs (Monthly)**

- **VPS (4GB RAM)**: $15-25
- **Domain**: $10-15
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$25-40/month

## 🔧 **Alternative: Shared Hosting**

If VPS is too expensive, you can:
1. Host frontend on Hostinger shared hosting
2. Use external backend services (Railway, Render, etc.)
3. Use external databases (Supabase, PlanetScale, etc.)

This would cost ~$5-10/month but with limited functionality. 