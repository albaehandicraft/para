import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, type AuthRequest } from "./middleware/auth";
import { BarcodeService } from "./services/barcode";
import { GeofencingService } from "./services/geofencing";
import { PDFGenerator } from "./services/pdfGenerator";
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

  // Get packages assigned to current kurir
  app.get("/api/packages/kurir", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const packages = await storage.getPackagesByKurir(req.user!.id);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Get available packages for pickup
  app.get("/api/packages/available", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const packages = await storage.getAvailablePackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available packages" });
    }
  });

  // Take an available package
  app.post("/api/packages/:id/take", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const packageId = parseInt(req.params.id);
      
      const package_ = await storage.getPackage(packageId);
      if (!package_) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      if (package_.status !== "created") {
        return res.status(400).json({ message: "Package is not available for pickup" });
      }
      
      if (package_.assignedKurirId) {
        return res.status(400).json({ message: "Package has already been taken by another courier" });
      }
      
      const updatedPackage = await storage.assignPackageToKurir(
        packageId, 
        req.user!.id, 
        req.user!.id
      );
      
      res.json({ message: "Package taken successfully", package: updatedPackage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  // Manual package pickup
  app.post("/api/packages/:id/pickup", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const { notes } = req.body;
      
      const package_ = await storage.getPackage(packageId);
      if (!package_) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      if (package_.status !== "assigned") {
        return res.status(400).json({ message: "Package is not ready for pickup" });
      }
      
      if (package_.assignedKurirId !== req.user!.id) {
        return res.status(403).json({ message: "Package not assigned to you" });
      }
      
      const updatedPackage = await storage.updatePackageStatus(
        packageId, 
        "picked_up", 
        req.user!.id, 
        notes || "Manual pickup"
      );
      
      // Log the pickup action
      await storage.logBarcodeScan(packageId, req.user!.id, "pickup");
      
      res.json({ message: "Package picked up successfully", package: updatedPackage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual package delivery
  app.post("/api/packages/:id/delivery", authenticateToken, requireRole(["kurir"]), async (req: AuthRequest, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (!notes || !notes.trim()) {
        return res.status(400).json({ message: "Delivery notes are required" });
      }
      
      const package_ = await storage.getPackage(packageId);
      if (!package_) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      if (!["picked_up", "in_transit"].includes(package_.status)) {
        return res.status(400).json({ message: "Package is not ready for delivery" });
      }
      
      if (package_.assignedKurirId !== req.user!.id) {
        return res.status(403).json({ message: "Package not assigned to you" });
      }
      
      const updatedPackage = await storage.updatePackageStatus(
        packageId, 
        "delivered", 
        req.user!.id, 
        notes
      );
      
      // Log the delivery action
      await storage.logBarcodeScan(packageId, req.user!.id, "delivery");
      
      res.json({ message: "Package delivered successfully", package: updatedPackage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

  app.put("/api/attendance/:id/approve", authenticateToken, requireRole(["pic", "admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const attendance = await storage.updateAttendanceStatus(id, status, req.user!.id, notes);
      
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Failed to update attendance" });
    }
  });

  // Enhanced attendance management endpoints
  app.get("/api/attendance/records", authenticateToken, requireRole(["pic", "admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, status, kurirId, search } = req.query;
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      let records = await storage.getAttendanceByDateRange(start, end);
      
      // Filter by status if specified
      if (status && status !== "all") {
        records = records.filter(record => record.status === status);
      }
      
      // Filter by kurir if specified
      if (kurirId && kurirId !== "all") {
        records = records.filter(record => record.kurirId === parseInt(kurirId as string));
      }
      
      // Filter by search term if specified
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        records = records.filter((record: any) => 
          record.kurirName?.toLowerCase().includes(searchTerm) ||
          record.notes?.toLowerCase().includes(searchTerm)
        );
      }
      
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.get("/api/attendance/stats", authenticateToken, requireRole(["pic", "admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const records = await storage.getAttendanceByDateRange(start, end);
      
      const stats = {
        totalPresent: records.filter(r => r.status === "present" || r.status === "approved").length,
        totalAbsent: records.filter(r => r.status === "absent" || r.status === "rejected").length,
        totalPending: records.filter(r => r.status === "pending").length,
        totalApproved: records.filter(r => r.status === "approved").length,
        totalRejected: records.filter(r => r.status === "rejected").length,
        attendanceRate: records.length > 0 ? 
          (records.filter(r => r.status === "present" || r.status === "approved").length / records.length) * 100 : 0,
        averageWorkingHours: records.length > 0 ? 
          records.reduce((sum, r: any) => sum + (r.workingHours || 0), 0) / records.length : 0,
        totalWorkingDays: records.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance stats" });
    }
  });

  app.get("/api/attendance/kurir-summary", authenticateToken, requireRole(["pic", "admin", "superadmin"]), async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const summary = await storage.getKurirAttendanceSummary(start, end);
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch kurir attendance summary" });
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
