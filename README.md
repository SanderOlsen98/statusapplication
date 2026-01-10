# Staytus - Status Page Application

A beautiful, self-hosted status page application for monitoring services, networks, and applications. Built for local on-premise deployment.

![Status Page](https://img.shields.io/badge/Status-Self--Hosted-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Table of Contents

1. [Features](#features)
2. [Quick Start (Development)](#quick-start-development)
3. [Deployment Guide](#deployment-guide)
4. [Project Structure](#project-structure)
5. [API Reference](#api-reference)
6. [Status Types](#status-types)
7. [Troubleshooting](#troubleshooting)

---

## Features

### Public Status Page
- 📊 Real-time system status overview
- 📈 90-day uptime history with visual graphs
- 🚨 Active incident display with live updates
- 🔧 Scheduled maintenance announcements
- 📜 Incident and maintenance history timeline

### Admin Dashboard
- 🔐 Secure JWT authentication
- ➕ Service and group management
- 🎯 Quick status updates
- 📝 Incident creation and updates
- 📅 Scheduled maintenance planning
- 📊 Statistics and analytics
- ⚙️ Site configuration

### Monitoring
- 🌐 HTTP endpoint monitoring
- ⏱️ Response time tracking
- 📊 Automatic uptime calculations
- 🔄 Configurable check intervals (every minute)

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Initialize database with sample data
npm run db:seed

# Start development server
npm run dev
```

### Access
- **Status Page:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Default Login:** `admin` / `admin123`

⚠️ **Change the default password after first login!**

---

## Deployment Guide

### Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Linux Server | Ubuntu 20.04+, Debian 11+, CentOS 8+ | `cat /etc/os-release` |
| Node.js | 18.x or higher | `node --version` |
| npm | 8.x or higher | `npm --version` |

#### Installing Node.js (if not installed)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

---

### Step 1: Transfer the Application

**Option A: Using Git**
```bash
sudo git clone <your-repo-url> /opt/staytus
cd /opt/staytus
sudo chown -R $USER:$USER /opt/staytus
```

**Option B: Using SCP (from local machine)**
```bash
scp -r /path/to/staytus user@your-server-ip:/opt/staytus
```

---

### Step 2: Install Dependencies

```bash
cd /opt/staytus
npm install --production
```

---

### Step 3: Initialize the Database

```bash
npm run db:seed
```

**Expected output:**
```
🌱 Seeding database...
✅ Created admin user (username: admin, password: admin123)
✅ Default settings initialized
✅ Created sample service groups
✅ Created sample services
✅ Generated 90 days of uptime history
🎉 Database seeding complete!
```

---

### Step 4: Build for Production

```bash
npm run build
```

---

### Step 5: Configure Environment Variables

```bash
cat > /opt/staytus/.env << 'EOF'
PORT=3001
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET
EOF
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

Update the `.env` file with the generated secret.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | Secret key for auth tokens | (required) |

---

### Step 6: Run the Application

#### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
cd /opt/staytus
pm2 start npm --name "staytus" -- start

# Configure auto-start on boot
pm2 save
pm2 startup
```

#### Option B: Using systemd

Create `/etc/systemd/system/staytus.service`:

```ini
[Unit]
Description=Staytus Status Page
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/staytus
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=JWT_SECRET=your-super-secret-key-here

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable staytus
sudo systemctl start staytus
```

---

### Step 7: Set Up Nginx Reverse Proxy

**Install Nginx:**
```bash
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS/RHEL
```

**Create configuration** at `/etc/nginx/sites-available/staytus`:

```nginx
server {
    listen 80;
    server_name status.yourcompany.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:3001;
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

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/staytus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Configure firewall:**
```bash
sudo ufw allow 'Nginx Full'  # Ubuntu
```

---

### Step 8: Access Your Status Page

| Page | URL |
|------|-----|
| **Public Status Page** | `http://your-server-ip/` |
| **Admin Dashboard** | `http://your-server-ip/admin` |

**Default Credentials:** `admin` / `admin123`

---

### Step 9: Change the Default Password!

⚠️ **Do this immediately after first login!**

1. Go to `/admin` and log in
2. Click **Settings** in the sidebar
3. Scroll to **Change Password**
4. Update your password

---

### Optional: Enable HTTPS

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d status.yourcompany.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Maintenance & Backups

### Database Location
```
/opt/staytus/data/staytus.db
```

### Manual Backup
```bash
cp /opt/staytus/data/staytus.db /backup/staytus-$(date +%Y%m%d).db
```

### Automated Daily Backups

Add to crontab (`crontab -e`):
```bash
# Daily backup at 2:00 AM
0 2 * * * cp /opt/staytus/data/staytus.db /backup/staytus-$(date +\%Y\%m\%d).db

# Keep only last 30 days
0 3 * * * find /backup -name "staytus-*.db" -mtime +30 -delete
```

### Updating Staytus
```bash
cd /opt/staytus
git pull
npm install --production
npm run build
pm2 restart staytus  # or: sudo systemctl restart staytus
```

---

## Quick Reference Commands

### PM2

| Action | Command |
|--------|---------|
| Start | `pm2 start staytus` |
| Stop | `pm2 stop staytus` |
| Restart | `pm2 restart staytus` |
| View logs | `pm2 logs staytus` |
| Status | `pm2 status` |
| Monitor | `pm2 monit` |

### systemd

| Action | Command |
|--------|---------|
| Start | `sudo systemctl start staytus` |
| Stop | `sudo systemctl stop staytus` |
| Restart | `sudo systemctl restart staytus` |
| View logs | `sudo journalctl -u staytus -f` |
| Status | `sudo systemctl status staytus` |

---

## Project Structure

```
staytus/
├── server/                 # Backend API
│   ├── routes/            # API endpoints
│   │   ├── auth.js        # Authentication
│   │   ├── services.js    # Service management
│   │   ├── incidents.js   # Incident management
│   │   ├── settings.js    # Configuration
│   │   └── monitor.js     # Health checks
│   ├── middleware/        # Auth middleware
│   ├── db.js              # SQLite database setup
│   ├── monitor.js         # Service monitoring logic
│   ├── seed.js            # Database seeding
│   └── index.js           # Express server
├── src/                   # Frontend React app
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── context/           # React context (auth)
│   └── lib/               # Utilities and API client
├── data/                  # SQLite database (auto-created)
├── dist/                  # Production build (auto-created)
└── public/                # Static assets
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Site settings |
| GET | `/api/settings/status` | Overall system status |
| GET | `/api/services` | All services |
| GET | `/api/services/groups` | Services grouped |
| GET | `/api/services/:id` | Single service with uptime |
| GET | `/api/services/:id/uptime` | Service uptime history |
| GET | `/api/incidents/active` | Active incidents |
| GET | `/api/incidents/scheduled` | Scheduled maintenance |
| GET | `/api/incidents/history/:days` | Incident history |
| GET | `/api/incidents/:id` | Single incident with updates |

### Admin Endpoints (require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/services` | Create service |
| PUT | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |
| PATCH | `/api/services/:id/status` | Quick status update |
| POST | `/api/services/groups` | Create group |
| PUT | `/api/services/groups/:id` | Update group |
| DELETE | `/api/services/groups/:id` | Delete group |
| POST | `/api/incidents` | Create incident |
| PUT | `/api/incidents/:id` | Update incident |
| DELETE | `/api/incidents/:id` | Delete incident |
| POST | `/api/incidents/:id/updates` | Add update |
| PUT | `/api/settings` | Update settings |
| POST | `/api/monitor/check` | Trigger manual check |
| POST | `/api/monitor/test` | Test a URL |

---

## Status Types

### Service Statuses

| Status | Description | Color |
|--------|-------------|-------|
| `operational` | Functioning normally | Green |
| `degraded` | Performance issues | Amber |
| `partial_outage` | Some features unavailable | Orange |
| `major_outage` | Completely unavailable | Red |
| `maintenance` | Planned maintenance | Indigo |

### Incident Statuses

| Status | Description |
|--------|-------------|
| `investigating` | Investigating the issue |
| `identified` | Cause identified |
| `monitoring` | Fix applied, monitoring |
| `resolved` | Issue resolved |

### Impact Levels

| Impact | Description |
|--------|-------------|
| `none` | No user impact |
| `minor` | Minor impact |
| `major` | Significant impact |
| `critical` | Critical impact |

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
pm2 logs staytus --lines 50
# or
sudo journalctl -u staytus -n 50
```

**Common issues:**
- Port already in use → Change PORT in `.env`
- Missing dependencies → Run `npm install`
- Permission issues → Check file ownership

### Can't Access the Page

1. Check if app is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Check Nginx:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. Check firewall:
   ```bash
   sudo ufw status
   ```

### Database Issues

**Reset the database:**
```bash
rm -rf /opt/staytus/data
npm run db:seed
```

---

## License

MIT License - feel free to use this for your own projects!
