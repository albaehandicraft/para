# Netlify Deployment Troubleshooting Guide

## Current Issue: Page Not Found Error

Your delivery management system is deployed but showing "Page not found" error. This typically occurs due to:

1. **Build Output Directory Mismatch**
2. **Missing Index File**
3. **Incorrect Redirect Configuration**

## Solution Steps

### Step 1: Update Netlify Site Settings
In your Netlify dashboard:
1. Go to Site Settings → Build & Deploy
2. Update these settings:
   - **Build command**: `vite build`
   - **Publish directory**: `dist/public`
   - **Functions directory**: `netlify/functions`

### Step 2: Configure Environment Variables
Add these in Site Settings → Environment Variables:
```
DATABASE_URL=postgresql://paradelivery_owner:npg_uV6KZbn4dCAy@ep-shy-flower-a123hzhg-pooler.ap-southeast-1.aws.neon.tech/paradelivery?sslmode=require
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
```

### Step 3: Manual Deployment Test
If automatic build fails, try manual deployment:
1. Run `vite build` locally
2. Drag and drop the `dist/public` folder to Netlify deploy area
3. Upload `_redirects` file to the deployed site's root

### Step 4: Verify File Structure
After build, check that these files exist:
```
dist/public/
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js
  │   └── index-[hash].css
  └── _redirects
```

## Alternative Simple Deployment

If build issues persist, use this simplified approach:

### Option 1: Static Site + External API
1. Build only the frontend: `vite build`
2. Deploy `dist/public` as static site
3. Host API separately (Railway, Render, etc.)
4. Update API endpoints in frontend

### Option 2: Manual Build Process
1. Clone repository locally
2. Run `npm install`
3. Run `vite build`
4. Manually upload `dist/public` contents to Netlify
5. Add `_redirects` file manually

## Quick Fix Commands

Update your repository with these files and redeploy:

**netlify.toml** (simplified):
```toml
[build]
  command = "vite build"
  publish = "dist/public"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**_redirects** (backup):
```
/api/*  /.netlify/functions/api/:splat  200
/*      /index.html   200
```

## Verification Steps
After deployment:
1. Visit: `https://yoursite.netlify.app/`
2. Should show login page
3. Test login with: superadmin/password123
4. Verify API calls work: Network tab should show successful requests

## Common Issues & Solutions

**Issue**: White screen or React errors
**Solution**: Check browser console for JavaScript errors

**Issue**: API calls fail
**Solution**: Verify serverless functions are deployed correctly

**Issue**: Database connection fails
**Solution**: Confirm DATABASE_URL environment variable is set

**Issue**: Build timeout
**Solution**: Use simplified build command without server bundling