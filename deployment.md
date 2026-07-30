# AKGEC Quiz Portal - Production Deployment Guide

This guide is designed for the DevOps/Infrastructure team to successfully deploy the AKGEC Quiz Portal for a 500-student concurrent exam load.

## Chosen Architecture
- **Server:** AWS EC2 `t3.small` (2 vCPUs, 2GB RAM)
- **Frontend:** Vercel (Free Tier CDN)
- **Backend API:** Node.js managed by PM2 (Fork Mode)
- **Cache/Queue:** Redis running locally on the EC2 instance via Docker (0ms latency, unlimited requests)
- **Database:** MongoDB Atlas (M0 Free Tier) - Optimized pool size to prevent connection drops

---

## Step 1: AWS EC2 Setup
1. Log into your AWS Console.
2. Launch a new EC2 Instance:
   - **AMI:** Ubuntu 24.04 LTS or 22.04 LTS
   - **Instance Type:** `t3.small`
   - **Key Pair:** Create a new one or use an existing one to SSH.
   - **Security Group (Firewall):** Allow SSH (22), HTTP (80), and HTTPS (443) from anywhere.
3. SSH into your server:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

## Step 2: Install Server Dependencies
Run the following commands on your EC2 terminal to install Node.js, Nginx, Docker, and PM2:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx and Docker
sudo apt install -y nginx docker.io docker-compose

# Install PM2 globally
sudo npm install -g pm2
```

## Step 3: Setup Local Redis (Zero Latency)
We use a local Redis container to completely bypass the limits of free-tier Redis providers.

1. Create a `docker-compose.yml` file on your server (or clone your repo which has one):
   ```yaml
   version: '3.8'
   services:
     redis:
       image: redis:alpine
       ports:
         - "6379:6379"
       command: redis-server --requirepass your_strong_redis_password
   ```
2. Start Redis:
   ```bash
   sudo docker-compose up -d
   ```

## Step 4: Setup the Backend Code
1. Clone the repository to the EC2 instance:
   ```bash
   git clone <your-repo-url>
   cd Quiz-portal/quiz-portal-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file (`nano .env`) and populate it:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<pass>@your-atlas-cluster/?retryWrites=true&w=majority
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=your_strong_redis_password
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   FRONTEND_URL=https://your-vercel-url.vercel.app
   ```
4. Start the backend with PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```
   *(Note: The `ecosystem.config.js` is already pre-configured to run in safe `fork` mode with 1 instance, which is perfect for `t3.small` and Socket.IO).*

## Step 5: Nginx Reverse Proxy Setup
We need Nginx to forward HTTP port 80 to our Node.js port 5000.

1. Open the Nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/quiz-api
   ```
2. Paste this configuration (replace `api.yourdomain.com` with your EC2 public IP or domain):
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com; # Or EC2 Public IP

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
3. Enable the config and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quiz-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Step 6: Frontend Deployment (Vercel)
1. Go to [Vercel.com](https://vercel.com/) and import the repository.
2. Select the `QUIZ` directory as the Root Directory.
3. Framework Preset: **Vite**
4. Environment Variables:
   - `VITE_API_URL` = `http://your-ec2-ip` (or `https://api.yourdomain.com` if you setup SSL)
5. Click **Deploy**.

---

## 🚨 Critical Architecture Notes for the Event Day
* **DO NOT** change `maxPoolSize: 30` in `config/db.js`. This is specifically set to protect the MongoDB Atlas M0 cluster from crashing under the 500-student load.
* **DO NOT** change PM2 to `instances: 'max'`. Keeping it at 1 instance ensures Socket.IO works properly and prevents memory overload on the 2GB RAM server.
* The backend code has been optimized so that mass submissions are processed asynchronously via BullMQ. This prevents the server from freezing at the 60th minute when all students submit together.
