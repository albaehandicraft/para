import { 
  users, packages, attendance, geofenceZones, packageStatusHistory, 
  salaryRecords, barcodeScanLogs,
  type User, type InsertUser, type Package, type InsertPackage,
  type Attendance, type InsertAttendance, type GeofenceZone, type InsertGeofenceZone,
  type UserRole, type PackageStatus, type AttendanceStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  
  // Authentication
  validateUser(username: string, password: string): Promise<User | null>;
  
  // Package management
  createPackage(packageData: InsertPackage): Promise<Package>;
  getPackage(id: number): Promise<Package | undefined>;
  getPackageByPackageId(packageId: string): Promise<Package | undefined>;
  updatePackageStatus(id: number, status: PackageStatus, changedBy: number, notes?: string): Promise<Package | undefined>;
  getPackagesByKurir(kurirId: number): Promise<Package[]>;
  getPackages(limit?: number): Promise<Package[]>;
  assignPackageToKurir(packageId: number, kurirId: number, assignedBy: number): Promise<Package | undefined>;
  
  // Attendance management
  createAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  getAttendanceByDate(kurirId: number, date: Date): Promise<Attendance | undefined>;
  updateAttendanceStatus(id: number, status: string, approvedBy: number): Promise<Attendance | undefined>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]>;
  
  // Geofencing
  createGeofenceZone(zoneData: InsertGeofenceZone): Promise<GeofenceZone>;
  getActiveGeofenceZones(): Promise<GeofenceZone[]>;
  updateGeofenceZone(id: number, updates: Partial<InsertGeofenceZone>): Promise<GeofenceZone | undefined>;
  
  // Barcode scanning
  logBarcodeScan(packageId: number, scannedBy: number, scanType: string, location?: { lat: number; lng: number }): Promise<void>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    activeDeliveries: number;
    kurirOnline: number;
    completedToday: number;
    totalRevenue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ 
        ...insertUser, 
        password: hashedPassword,
        role: insertUser.role as UserRole
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...updates };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    if (updateData.role) {
      updateData.role = updateData.role as UserRole;
    }
    
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createPackage(packageData: InsertPackage): Promise<Package> {
    const packageId = `PKG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = `${packageId}-${Date.now()}`;
    
    const [pkg] = await db
      .insert(packages)
      .values({
        ...packageData,
        packageId,
        barcode,
        status: (packageData.status || "created") as PackageStatus,
        priority: packageData.priority || "normal",
      })
      .returning();
    return pkg;
  }

  async getPackage(id: number): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg || undefined;
  }

  async getPackageByPackageId(packageId: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.packageId, packageId));
    return pkg || undefined;
  }

  async updatePackageStatus(id: number, status: PackageStatus, changedBy: number, notes?: string): Promise<Package | undefined> {
    const currentPackage = await this.getPackage(id);
    if (!currentPackage) return undefined;

    const [updatedPackage] = await db
      .update(packages)
      .set({ 
        status, 
        updatedAt: new Date(),
        ...(status === "delivered" && { deliveredAt: new Date() })
      })
      .where(eq(packages.id, id))
      .returning();

    // Log status change
    await db.insert(packageStatusHistory).values({
      packageId: id,
      fromStatus: currentPackage.status,
      toStatus: status,
      changedBy,
      notes,
    });

    return updatedPackage || undefined;
  }

  async getPackagesByKurir(kurirId: number): Promise<Package[]> {
    return await db.select().from(packages).where(eq(packages.assignedKurirId, kurirId));
  }

  async getPackages(limit?: number): Promise<Package[]> {
    const query = db.select().from(packages).orderBy(desc(packages.createdAt));
    if (limit) {
      query.limit(limit);
    }
    return await query;
  }

  async assignPackageToKurir(packageId: number, kurirId: number, assignedBy: number): Promise<Package | undefined> {
    const [pkg] = await db
      .update(packages)
      .set({ 
        assignedKurirId: kurirId, 
        status: "assigned",
        updatedAt: new Date() 
      })
      .where(eq(packages.id, packageId))
      .returning();
    
    if (pkg) {
      await db.insert(packageStatusHistory).values({
        packageId,
        fromStatus: "created",
        toStatus: "assigned",
        changedBy: assignedBy,
        notes: `Assigned to kurir ID: ${kurirId}`,
      });
    }
    
    return pkg || undefined;
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [att] = await db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    return att;
  }

  async getAttendanceByDate(kurirId: number, date: Date): Promise<Attendance | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [att] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.kurirId, kurirId),
          gte(attendance.date, startOfDay),
          lte(attendance.date, endOfDay)
        )
      );
    return att || undefined;
  }

  async updateAttendanceStatus(id: number, status: string, approvedBy: number): Promise<Attendance | undefined> {
    const [att] = await db
      .update(attendance)
      .set({ status: status as any, approvedBy })
      .where(eq(attendance.id, id))
      .returning();
    return att || undefined;
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(
        and(
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      )
      .orderBy(desc(attendance.date));
  }

  async createGeofenceZone(zoneData: InsertGeofenceZone): Promise<GeofenceZone> {
    const [zone] = await db
      .insert(geofenceZones)
      .values(zoneData)
      .returning();
    return zone;
  }

  async getActiveGeofenceZones(): Promise<GeofenceZone[]> {
    return await db
      .select()
      .from(geofenceZones)
      .where(eq(geofenceZones.isActive, true));
  }

  async updateGeofenceZone(id: number, updates: Partial<InsertGeofenceZone>): Promise<GeofenceZone | undefined> {
    const [zone] = await db
      .update(geofenceZones)
      .set(updates)
      .where(eq(geofenceZones.id, id))
      .returning();
    return zone || undefined;
  }

  async logBarcodeScan(packageId: number, scannedBy: number, scanType: string, location?: { lat: number; lng: number }): Promise<void> {
    await db.insert(barcodeScanLogs).values({
      packageId,
      scannedBy,
      scanType,
      location: location ? JSON.stringify(location) : null,
    });
  }

  async getDashboardMetrics(): Promise<{
    activeDeliveries: number;
    kurirOnline: number;
    completedToday: number;
    totalRevenue: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeDeliveries] = await db
      .select({ count: count() })
      .from(packages)
      .where(sql`${packages.status} IN ('assigned', 'picked_up', 'in_transit')`);

    const [kurirOnline] = await db
      .select({ count: count() })
      .from(attendance)
      .where(
        and(
          gte(attendance.date, today),
          sql`${attendance.checkInTime} IS NOT NULL`,
          sql`${attendance.checkOutTime} IS NULL`
        )
      );

    const [completedToday] = await db
      .select({ count: count() })
      .from(packages)
      .where(
        and(
          eq(packages.status, "delivered"),
          gte(packages.deliveredAt!, today),
          sql`${packages.deliveredAt} < ${tomorrow}`
        )
      );

    return {
      activeDeliveries: activeDeliveries.count,
      kurirOnline: kurirOnline.count,
      completedToday: completedToday.count,
      totalRevenue: 0, // Calculate based on your business logic
    };
  }
}

export const storage = new DatabaseStorage();
