import { 
  users, packages, attendance, geofenceZones, packageStatusHistory, 
  salaryRecords, barcodeScanLogs,
  type User, type InsertUser, type Package, type InsertPackage,
  type Attendance, type InsertAttendance, type GeofenceZone, type InsertGeofenceZone,
  type UserRole, type PackageStatus, type AttendanceStatus
} from "@shared/schema";
import { db, pool, pgPool } from "./db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import bcrypt from "bcrypt";
import { mapRowToPackage } from "./packageMapper";

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
  getAvailablePackages(): Promise<Package[]>;
  assignPackageToKurir(packageId: number, kurirId: number, assignedBy: number): Promise<Package | undefined>;
  
  // Attendance management
  createAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  getAttendanceByDate(kurirId: number, date: Date): Promise<Attendance | undefined>;
  updateAttendanceStatus(id: number, status: string, approvedBy: number): Promise<Attendance | undefined>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]>;
  getKurirAttendanceHistory(kurirId: number, startDate: Date, endDate: Date): Promise<Attendance[]>;
  
  // Geofencing
  createGeofenceZone(zoneData: InsertGeofenceZone): Promise<GeofenceZone>;
  getActiveGeofenceZones(): Promise<GeofenceZone[]>;
  updateGeofenceZone(id: number, updates: Partial<InsertGeofenceZone>): Promise<GeofenceZone | undefined>;
  deleteGeofenceZone(id: number): Promise<boolean>;
  
  // Barcode scanning
  logBarcodeScan(packageId: number, scannedBy: number, scanType: string, location?: { lat: number; lng: number }): Promise<void>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    activeDeliveries: number;
    kurirOnline: number;
    completedToday: number;
    totalRevenue: number;
  }>;
  
  // Reports data
  getReportsData(startDate: Date, endDate: Date): Promise<{
    summary: {
      totalPackages: number;
      totalDelivered: number;
      totalUsers: number;
      totalKurir: number;
      activeDeliveries: number;
      averageDeliveryTime: number;
      successRate: number;
      totalRevenue: number;
    };
    packagesByStatus: Array<{ name: string; value: number; color: string }>;
    packagesByPriority: Array<{ name: string; value: number; color: string }>;
    deliveryTrends: Array<{ date: string; delivered: number; created: number; failed: number }>;
    kurirPerformance: Array<{ 
      id: number; 
      name: string; 
      packagesDelivered: number; 
      attendanceRate: number; 
      averageDeliveryTime: number;
      status: string;
    }>;
    attendanceStats: Array<{ date: string; present: number; absent: number; pending: number }>;
    geofenceUsage: Array<{ name: string; checkIns: number; zone: string }>;
    revenue: Array<{ date: string; amount: number; packages: number }>;
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
    try {
      const freshClient = await pgPool.connect();
      try {
        await freshClient.query('BEGIN');
        const result = await freshClient.query(`
          SELECT * FROM packages 
          WHERE assigned_kurir_id = $1
          ORDER BY created_at DESC
        `, [kurirId]);
        await freshClient.query('COMMIT');
        
        const packageRows = result.rows.map(mapRowToPackage);
        
        return packageRows as Package[];
      } catch (queryError) {
        await freshClient.query('ROLLBACK');
        throw queryError;
      } finally {
        freshClient.release();
      }
    } catch (error) {
      console.error("Error fetching packages for kurir:", error);
      return [];
    }
  }

  async getAvailablePackages(): Promise<Package[]> {
    try {
      const freshClient = await pgPool.connect();
      try {
        await freshClient.query('BEGIN');
        const result = await freshClient.query(`
          SELECT * FROM packages 
          WHERE status = 'created' 
          AND assigned_kurir_id IS NULL
          ORDER BY created_at DESC
        `);
        await freshClient.query('COMMIT');
        
        const packageRows = result.rows.map(mapRowToPackage);
        
        return packageRows as Package[];
      } catch (queryError) {
        await freshClient.query('ROLLBACK');
        throw queryError;
      } finally {
        freshClient.release();
      }
    } catch (error) {
      console.error("Error fetching available packages:", error);
      return [];
    }
  }

  async getPackages(limit?: number): Promise<Package[]> {
    try {
      // Force a completely fresh connection to bypass any caching
      const freshClient = await pgPool.connect();
      
      try {
        // Force transaction isolation to ensure we see all committed data
        await freshClient.query('BEGIN');
        await freshClient.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        
        const limitClause = limit ? `LIMIT ${limit}` : 'LIMIT 50';
        const query = `
          SELECT p.id, p.package_id, p.barcode, p.recipient_name, p.recipient_phone, p.recipient_address, 
                 p.priority, p.status, p.assigned_kurir_id, p.created_by, p.approved_by, p.delivered_at, 
                 p.delivery_proof, p.notes, p.created_at, p.updated_at,
                 p.weight, p.dimensions, p.value, p.sender_name, p.sender_phone, p.pickup_address,
                 u.full_name as assigned_kurir_name
          FROM packages p
          LEFT JOIN users u ON p.assigned_kurir_id = u.id
          ORDER BY p.created_at DESC 
          ${limitClause}
        `;
        
        const result = await freshClient.query(query);
        await freshClient.query('COMMIT');
        
        const packageRows = result.rows;
        console.log(`Successfully fetched ${packageRows.length} packages from external Neon DB`);
        
        // Add resi tracking numbers based on package IDs  
        packageRows.forEach((pkg) => {
          pkg.resi = `RESI${String(pkg.id).padStart(6, '0')}`;
        });
        
        return packageRows as Package[];
      } catch (queryError) {
        await freshClient.query('ROLLBACK');
        throw queryError;
      } finally {
        freshClient.release();
      }
    } catch (error) {
      console.error("Error fetching packages from external Neon DB:", error);
      return [];
    }
  }

  async assignPackageToKurir(packageId: number, kurirId: number, assignedBy: number): Promise<Package | undefined> {
    try {
      const freshClient = await pgPool.connect();
      try {
        await freshClient.query('BEGIN');
        
        // Update package assignment
        const updateResult = await freshClient.query(`
          UPDATE packages 
          SET assigned_kurir_id = $1, status = 'assigned', updated_at = NOW()
          WHERE id = $2 AND (assigned_kurir_id IS NULL OR status = 'created')
          RETURNING *
        `, [kurirId, packageId]);
        
        if (updateResult.rows.length === 0) {
          await freshClient.query('ROLLBACK');
          throw new Error("Package not available or already assigned");
        }
        
        const updatedPackage = updateResult.rows[0];
        
        // Log status change in package_status_history if table exists
        try {
          await freshClient.query(`
            INSERT INTO package_status_history (package_id, from_status, to_status, changed_by, notes, timestamp)
            VALUES ($1, 'created', 'assigned', $2, $3, NOW())
          `, [packageId, assignedBy, `Assigned to kurir ID: ${kurirId}`]);
        } catch (historyError) {
          // History table might not exist, continue without it
          console.log("Package status history not recorded:", historyError);
        }
        
        await freshClient.query('COMMIT');
        
        return mapRowToPackage(updatedPackage) as Package;
        
      } catch (queryError) {
        await freshClient.query('ROLLBACK');
        throw queryError;
      } finally {
        freshClient.release();
      }
    } catch (error) {
      console.error("Error assigning package to kurir:", error);
      throw error;
    }
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const attendanceRecord = {
      date: attendanceData.date,
      kurirId: attendanceData.kurirId,
      ...(attendanceData.checkInTime && { checkInTime: attendanceData.checkInTime }),
      ...(attendanceData.checkOutTime && { checkOutTime: attendanceData.checkOutTime }),
      ...(attendanceData.checkInLat && { checkInLat: attendanceData.checkInLat }),
      ...(attendanceData.checkInLng && { checkInLng: attendanceData.checkInLng }),
      ...(attendanceData.checkOutLat && { checkOutLat: attendanceData.checkOutLat }),
      ...(attendanceData.checkOutLng && { checkOutLng: attendanceData.checkOutLng }),
      status: (attendanceData.status || "pending") as any,
      ...(attendanceData.approvedBy && { approvedBy: attendanceData.approvedBy }),
      ...(attendanceData.notes && { notes: attendanceData.notes }),
    };

    const [att] = await db
      .insert(attendance)
      .values(attendanceRecord)
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

  async getKurirAttendanceHistory(kurirId: number, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.kurirId, kurirId),
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

  async deleteGeofenceZone(id: number): Promise<boolean> {
    const result = await db
      .delete(geofenceZones)
      .where(eq(geofenceZones.id, id));
    return (result.rowCount || 0) > 0;
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

  async getReportsData(startDate: Date, endDate: Date): Promise<{
    summary: any;
    packagesByStatus: any[];
    packagesByPriority: any[];
    deliveryTrends: any[];
    kurirPerformance: any[];
    attendanceStats: any[];
    geofenceUsage: any[];
    revenue: any[];
  }> {
    // Summary statistics
    const [totalPackagesResult] = await db
      .select({ count: count() })
      .from(packages)
      .where(
        and(
          gte(packages.createdAt, startDate),
          lte(packages.createdAt, endDate)
        )
      );

    const [deliveredPackagesResult] = await db
      .select({ count: count() })
      .from(packages)
      .where(
        and(
          eq(packages.status, "delivered"),
          gte(packages.createdAt, startDate),
          lte(packages.createdAt, endDate)
        )
      );

    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [totalKurirResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "kurir"));

    const [activeDeliveriesResult] = await db
      .select({ count: count() })
      .from(packages)
      .where(sql`${packages.status} IN ('assigned', 'picked_up', 'in_transit')`);

    // Package status distribution
    const packageStatusData = await db
      .select({
        status: packages.status,
        count: count()
      })
      .from(packages)
      .where(
        and(
          gte(packages.createdAt, startDate),
          lte(packages.createdAt, endDate)
        )
      )
      .groupBy(packages.status);

    const statusColors: Record<string, string> = {
      created: '#6b7280',
      assigned: '#3b82f6',
      picked_up: '#f59e0b',
      in_transit: '#8b5cf6',
      delivered: '#10b981',
      failed: '#ef4444'
    };

    const packagesByStatus = packageStatusData.map(item => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
      value: item.count,
      color: statusColors[item.status] || '#6b7280'
    }));

    // Package priority distribution
    const packagePriorityData = await db
      .select({
        priority: packages.priority,
        count: count()
      })
      .from(packages)
      .where(
        and(
          gte(packages.createdAt, startDate),
          lte(packages.createdAt, endDate)
        )
      )
      .groupBy(packages.priority);

    const priorityColors: Record<string, string> = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };

    const packagesByPriority = packagePriorityData.map(item => ({
      name: item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : 'Unknown',
      value: item.count,
      color: priorityColors[item.priority || 'normal'] || '#6b7280'
    }));

    // Kurir performance data
    const kurirData = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        packagesDelivered: count(packages.id),
      })
      .from(users)
      .leftJoin(packages, and(
        eq(packages.assignedKurirId, users.id),
        eq(packages.status, "delivered"),
        gte(packages.createdAt, startDate),
        lte(packages.createdAt, endDate)
      ))
      .where(eq(users.role, "kurir"))
      .groupBy(users.id, users.fullName);

    const kurirPerformance = kurirData.map(kurir => ({
      id: kurir.id,
      name: kurir.fullName,
      packagesDelivered: kurir.packagesDelivered,
      attendanceRate: 85, // Calculate based on attendance data
      averageDeliveryTime: 24, // Calculate based on delivery times
      status: "active"
    }));

    // Generate daily delivery trends (simplified)
    const deliveryTrends = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      deliveryTrends.push({
        date: dateStr,
        delivered: Math.floor(Math.random() * 10), // Replace with actual data
        created: Math.floor(Math.random() * 15),
        failed: Math.floor(Math.random() * 3)
      });
    }

    // Attendance statistics (simplified)
    const attendanceStats = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      attendanceStats.push({
        date: dateStr,
        present: Math.floor(Math.random() * 8),
        absent: Math.floor(Math.random() * 2),
        pending: Math.floor(Math.random() * 1)
      });
    }

    // Geofence usage
    const geofenceData = await db
      .select({
        name: geofenceZones.name,
        checkIns: count(attendance.id)
      })
      .from(geofenceZones)
      .leftJoin(attendance, and(
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .groupBy(geofenceZones.name);

    const geofenceUsage = geofenceData.map(zone => ({
      name: zone.name,
      checkIns: zone.checkIns,
      zone: zone.name
    }));

    // Revenue data (simplified)
    const revenue = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      revenue.push({
        date: dateStr,
        amount: Math.floor(Math.random() * 500000) + 100000,
        packages: Math.floor(Math.random() * 10) + 5
      });
    }

    const summary = {
      totalPackages: totalPackagesResult.count,
      totalDelivered: deliveredPackagesResult.count,
      totalUsers: totalUsersResult.count,
      totalKurir: totalKurirResult.count,
      activeDeliveries: activeDeliveriesResult.count,
      averageDeliveryTime: 24,
      successRate: totalPackagesResult.count > 0 ? 
        Math.round((deliveredPackagesResult.count / totalPackagesResult.count) * 100) : 0,
      totalRevenue: revenue.reduce((sum, item) => sum + item.amount, 0)
    };

    return {
      summary,
      packagesByStatus,
      packagesByPriority,
      deliveryTrends,
      kurirPerformance,
      attendanceStats,
      geofenceUsage,
      revenue
    };
  }
}

export const storage = new DatabaseStorage();
