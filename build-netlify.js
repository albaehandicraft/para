#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

console.log('Starting Netlify build process...');

try {
  // Run the standard build
  console.log('Building React app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Ensure the root dist directory exists for Netlify
  const rootDist = './dist';
  if (!existsSync(rootDist)) {
    mkdirSync(rootDist, { recursive: true });
  }

  // Copy _redirects to the build output
  if (existsSync('./_redirects')) {
    const targetPath = existsSync('./dist/public') ? './dist/public/_redirects' : './dist/_redirects';
    copyFileSync('./_redirects', targetPath);
    console.log('Copied _redirects to build output');
  }

  console.log('Netlify build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}