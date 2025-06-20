#!/bin/bash
set -e

echo "Starting Netlify build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the client application
echo "Building React application..."
cd client
npm run build
cd ..

# Ensure output directory exists
mkdir -p dist

# Move built files to correct location
echo "Moving built files..."
if [ -d "dist/public" ]; then
    cp -r dist/public/* dist/
    # Copy redirects file
    cp _redirects dist/_redirects
else
    echo "Build output not found in expected location"
    exit 1
fi

echo "Build completed successfully!"