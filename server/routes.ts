import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, type AuthRequest } from "./middleware/auth";
import { BarcodeService } from "./services/barcode";
import { GeofencingService } from "./services/geofencing";
import { insertUserSchema, insertPackageSchema, loginSchema, insertGeofenceZoneSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // User management routes
  app.get("/api/users", authenticateToken, requireRole(["superadmin", "admin"]), async (req, res) => {
    try {
      const { role } = req.query;
      const users = role ? await storage.getUsersByRole(role as any) : await storage.getUsersByRole("kurir");
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const { role } = req.query;
      
      if (role && typeof role === 'string') {
        const users = await storage.getUsersByRole(role as any);
        res.json(users.map(user => ({ ...user, password: undefined })));
      } else {
        // Return all users if no role specified
        const users = await storage.getUsersByRole("kurir"); // Default to kurir for now
        res.json(users.map(user => ({ ...user, password: undefined })));
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Package management routes
  app.get("/api/packages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const packages = await storage.getPackages(50);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.post("/api/packages", authenticateToken, requireRole(["admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const packageData = insertPackageSchema.parse(req.body);
      
      // Generate package ID and barcode
      const packageId = `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const barcode = BarcodeService.generateBarcode(packageId);
      
      const package_ = await storage.createPackage({
        ...packageData,
        packageId,
        barcode,
        createdBy: req.user!.id,
      });
      
      res.json(package_);
    } catch (error) {
      res.status(400).json({ message: "Failed to create package" });
    }
  });

  app.put("/api/packages/:id/assign", authenticateToken, requireRole(["admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const { kurirId } = req.body;
      
      const package_ = await storage.assignPackageToKurir(packageId, kurirId, req.user!.id);
      
      if (!package_) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      res.json(package_);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign package" });
    }
  });

  app.get("/api/packages/kurir/:kurirId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const kurirId = parseInt(req.params.kurirId);
      
      // Only allow kurir to see their own packages or admin/superadmin to see any
      if (req.user!.role === "kurir" && req.user!.id !== kurirId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const packages = await storage.getPackagesByKurir(kurirId);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Barcode scanning routes
  app.post("/api/barcode/scan", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const { barcode, scanType, location } = req.body;
      
      const package_ = await BarcodeService.scanBarcode(
        barcode,
        req.user!.id,
        scanType,
        location
      );
      
      res.json({ message: "Scan successful", package: package_ });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Attendance routes
  app.post("/api/attendance/checkin", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const { lat, lng } = req.body;
      
      // Validate location against geofence
      const isValidLocation = await GeofencingService.validateLocation(lat, lng);
      if (!isValidLocation) {
        return res.status(400).json({ message: "Check-in location is outside allowed area" });
      }
      
      const today = new Date();
      const existingAttendance = await storage.getAttendanceByDate(req.user!.id, today);
      
      if (existingAttendance) {
        return res.status(400).json({ message: "Already checked in today" });
      }
      
      const attendance = await storage.createAttendance({
        kurirId: req.user!.id,
        date: today,
        checkInTime: new Date(),
        checkInLat: lat.toString(),
        checkInLng: lng.toString(),
        status: "present",
      });
      
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  app.post("/api/attendance/checkout", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const { lat, lng } = req.body;
      
      const today = new Date();
      const attendance = await storage.getAttendanceByDate(req.user!.id, today);
      
      if (!attendance) {
        return res.status(400).json({ message: "No check-in record found for today" });
      }
      
      if (attendance.checkOutTime) {
        return res.status(400).json({ message: "Already checked out today" });
      }
      
      // Update with checkout information
      const updatedAttendance = await storage.updateAttendanceStatus(
        attendance.id,
        "present",
        req.user!.id
      );
      
      res.json(updatedAttendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to check out" });
    }
  });

  // Kurir attendance endpoints
  app.get("/api/attendance/today", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const today = new Date();
      const attendance = await storage.getAttendanceByDate(req.user!.id, today);
      res.json(attendance || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
  });

  app.get("/api/attendance/history", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      
      const attendance = await storage.getKurirAttendanceHistory(req.user!.id, thirtyDaysAgo, today);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance history" });
    }
  });

  app.get("/api/attendance", authenticateToken, requireRole(["admin", "superadmin", "pic"]), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const attendance = await storage.getAttendanceByDateRange(start, end);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.put("/api/attendance/:id/approve", authenticateToken, requireRole(["pic"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const attendance = await storage.updateAttendanceStatus(id, status, req.user!.id);
      
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Failed to update attendance" });
    }
  });

  // Reports endpoints
  app.get("/api/reports", authenticateToken, requireRole(["superadmin", "admin"]), async (req, res) => {
    try {
      const { from, to, type } = req.query;
      const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to ? new Date(to as string) : new Date();
      
      const reportsData = await storage.getReportsData(startDate, endDate);
      res.json(reportsData);
    } catch (error) {
      console.error("Error fetching reports data:", error);
      res.status(500).json({ message: "Failed to fetch reports data" });
    }
  });

  app.get("/api/reports/export", authenticateToken, requireRole(["superadmin", "admin"]), async (req, res) => {
    try {
      const { format, from, to } = req.query;
      const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to ? new Date(to as string) : new Date();
      
      const reportsData = await storage.getReportsData(startDate, endDate);
      
      const { PDFGenerator } = await import("../services/pdfGenerator");
      
      if (format === "pdf") {
        const pdfBuffer = await PDFGenerator.generatePDF(
          reportsData, 
          from as string || startDate.toISOString().split('T')[0],
          to as string || endDate.toISOString().split('T')[0]
        );
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="delivery-report-${from || startDate.toISOString().split('T')[0]}-to-${to || endDate.toISOString().split('T')[0]}.pdf"`);
        res.send(pdfBuffer);
      } else if (format === "csv") {
        const csvData = PDFGenerator.generateCSV(reportsData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="delivery-report-${from || startDate.toISOString().split('T')[0]}-to-${to || endDate.toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
      } else if (format === "excel") {
        // For Excel, use CSV format with Excel MIME type
        const csvData = PDFGenerator.generateCSV(reportsData);
        
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename="delivery-report-${from || startDate.toISOString().split('T')[0]}-to-${to || endDate.toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
      } else {
        res.status(400).json({ message: "Unsupported export format" });
      }
    } catch (error) {
      console.error("Error exporting reports:", error);
      res.status(500).json({ message: "Failed to export reports" });
    }
  });

  // Geofencing routes
  app.get("/api/geofence", authenticateToken, async (req, res) => {
    try {
      const zones = await storage.getActiveGeofenceZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch geofence zones" });
    }
  });

  app.post("/api/geofence", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const zoneData = insertGeofenceZoneSchema.parse(req.body);
      const zone = await storage.createGeofenceZone({
        ...zoneData,
        createdBy: req.user!.id,
      });
      res.json(zone);
    } catch (error) {
      res.status(400).json({ message: "Failed to create geofence zone" });
    }
  });

  app.put("/api/geofence/:id", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      const updates = insertGeofenceZoneSchema.partial().parse(req.body);
      
      const zone = await storage.updateGeofenceZone(zoneId, updates);
      
      if (!zone) {
        return res.status(404).json({ message: "Geofence zone not found" });
      }
      
      res.json(zone);
    } catch (error) {
      res.status(400).json({ message: "Failed to update geofence zone" });
    }
  });

  app.delete("/api/geofence/:id", authenticateToken, requireRole(["superadmin", "admin"]), async (req: AuthRequest, res) => {
    try {
      const zoneId = parseInt(req.params.id);
      
      const success = await storage.deleteGeofenceZone(zoneId);
      
      if (!success) {
        return res.status(404).json({ message: "Geofence zone not found" });
      }
      
      res.json({ message: "Geofence zone deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete geofence zone" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
