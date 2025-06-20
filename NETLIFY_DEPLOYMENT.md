# Netlify Deployment Guide - Pengiriman System

## Overview
This guide covers deploying your delivery management system to Netlify with serverless functions and external Neon PostgreSQL database.

## Prerequisites
- Netlify account
- External Neon database connection string
- Repository pushed to GitHub/GitLab

## Deployment Steps

### 1. Repository Setup
1. Push your code to GitHub/GitLab
2. Connect repository to Netlify

### 2. Environment Variables
Configure these environment variables in Netlify Dashboard:

**Required Variables:**
```
DATABASE_URL=postgresql://paradelivery_owner:npg_uV6KZbn4dCAy@ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech/paradelivery?sslmode=require
NODE_ENV=production
JWT_SECRET=your-jwt-secret-key
```

**Optional Variables:**
```
VITE_API_URL=/.netlify/functions/api
```

### 3. Build Configuration
The `netlify.toml` file is already configured with:
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- API redirects: `/api/*` → `/.netlify/functions/api/:splat`
- SPA redirects: `/*` → `/index.html`

### 4. Database Setup
Your external Neon database is already configured:
- Host: ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech
- Database: paradelivery
- User: paradelivery_owner
- SSL: Required

### 5. Deployment Process
1. **Connect Repository**: Link your GitHub/GitLab repo to Netlify
2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Set Environment Variables**: Add all required variables
4. **Deploy**: Netlify will automatically build and deploy

## Architecture
- **Frontend**: React SPA served from CDN
- **Backend**: Serverless functions handling API requests
- **Database**: External Neon PostgreSQL (persistent)
- **Authentication**: JWT tokens with secure storage

## Post-Deployment
1. Test all functionality including:
   - User authentication
   - Package management
   - Attendance tracking
   - Barcode scanning
   - Geofencing
2. Monitor function logs in Netlify dashboard
3. Verify database connections

## Troubleshooting
- **Database Connection**: Ensure DATABASE_URL is correctly set
- **CORS Issues**: Already configured in serverless function
- **Function Timeout**: Netlify functions have 10s timeout (should be sufficient)
- **Build Errors**: Check Node.js version (configured for Node 20)

## Security Considerations
- JWT_SECRET should be a strong, random string
- Database credentials are secured via environment variables
- CORS is configured for production domains
- All API endpoints use authentication middleware

## Monitoring
- Netlify Analytics for traffic monitoring
- Function logs for debugging
- Database monitoring via Neon dashboard