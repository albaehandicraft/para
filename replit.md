# Pengiriman System - Delivery Management Platform

## Overview

This is a full-stack delivery management system built with React, Express.js, and PostgreSQL. The system provides comprehensive package tracking, user management, attendance monitoring, and geofencing capabilities for delivery operations. It supports multiple user roles including super admin, admin, PIC (Person in Charge), and courier (kurir).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pool**: Neon serverless connection pooling

## Key Components

### User Management System
- **Multi-role Authentication**: Supports superadmin, admin, PIC, and kurir roles
- **Role-based Access Control**: Fine-grained permissions based on user roles
- **JWT Token Management**: Secure token-based authentication with refresh capabilities
- **Password Security**: Bcrypt hashing for secure password storage

### Package Management
- **Package Lifecycle**: Complete tracking from creation to delivery
- **Status Management**: Real-time status updates (created, assigned, picked_up, in_transit, delivered, failed)
- **Barcode Integration**: Automatic barcode generation and scanning capabilities
- **Assignment System**: Intelligent package assignment to couriers

### Geofencing System
- **Zone Management**: Create and manage delivery zones with configurable radius
- **Location Validation**: Real-time location verification for check-ins and deliveries
- **Distance Calculation**: Haversine formula implementation for accurate distance measurements

### Attendance Tracking
- **Real-time Check-in/out**: GPS-based attendance with geofence validation
- **Approval Workflow**: PIC approval system for attendance records
- **Status Management**: Comprehensive status tracking (present, absent, pending, approved, rejected)

### Barcode Scanning
- **Mobile-first Design**: Camera-based barcode scanning for package operations
- **Dual Scan Types**: Separate flows for pickup and delivery scanning
- **Location Logging**: Automatic location capture during scan operations

## Data Flow

### Authentication Flow
1. User login credentials validated against database
2. JWT token generated and returned to client
3. Token stored in localStorage and included in API requests
4. Middleware validates token and extracts user information
5. Role-based access control applied to protected routes

### Package Management Flow
1. Admin/PIC creates new package with recipient details
2. System generates unique package ID and barcode
3. Package assigned to available courier
4. Courier scans barcode for pickup confirmation
5. Real-time status updates throughout delivery process
6. Final delivery confirmation with location verification

### Attendance Flow
1. Courier attempts check-in with geolocation
2. System validates location against configured geofence zones
3. Attendance record created with pending status
4. PIC reviews and approves/rejects attendance
5. Approved records used for payroll and performance tracking

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Comprehensive UI component library
- **drizzle-orm**: Type-safe database operations
- **bcrypt**: Password hashing and validation
- **jsonwebtoken**: JWT token management
- **express**: Web application framework

### Development Tools
- **Vite**: Fast build tool and dev server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler
- **TSX**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: PostgreSQL instance with automatic migrations
- **Port Configuration**: Server runs on port 5000 with proxy setup

### Production Build
- **Client Build**: Vite builds React app to static assets
- **Server Bundle**: ESBuild bundles server code for production
- **Static Serving**: Express serves built client assets
- **Database Migrations**: Automated schema deployment

### Replit Configuration
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Auto-scaling**: Configured for automatic scaling deployment
- **Environment**: Development and production configurations
- **Port Mapping**: External port 80 mapped to internal port 5000

## Changelog

- June 19, 2025. Initial setup
- June 19, 2025. Configured external Neon database connection and created demo users

## User Preferences

Preferred communication style: Simple, everyday language.