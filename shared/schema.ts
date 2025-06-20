import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, json, varchar, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["superadmin", "admin", "pic", "kurir"] as const;
export type UserRole = typeof userRoles[number];

// Package status enum
export const packageStatuses = ["created", "assigned", "picked_up", "in_transit", "delivered", "failed"] as const;
export type PackageStatus = typeof packageStatuses[number];

// Attendance status enum
export const attendanceStatuses = ["present", "absent", "pending", "approved", "rejected"] as const;
export type AttendanceStatus = typeof attendanceStatuses[number];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().$type<UserRole>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Geofencing zones
export const geofenceZones = pgTable("geofence_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  centerLat: decimal("center_lat", { precision: 10, scale: 8 }).notNull(),
  centerLng: decimal("center_lng", { precision: 11, scale: 8 }).notNull(),
  radius: integer("radius").notNull(), // in meters
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Packages/Pengiriman
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  packageId: text("package_id").notNull().unique(),
  resi: text("resi").notNull().unique(), // Nomor resi tracking
  barcode: text("barcode").unique(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  priority: text("priority").default("normal"), // normal, high, urgent
  status: text("status").notNull().$type<PackageStatus>().default("created"),
  assignedKurirId: integer("assigned_kurir_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  deliveredAt: timestamp("delivered_at"),
  deliveryProof: text("delivery_proof"), // image URL or base64
  notes: text("notes"),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  dimensions: text("dimensions"),
  value: integer("value").default(0),
  senderName: text("sender_name"),
  senderPhone: text("sender_phone"),
  pickupAddress: text("pickup_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendance tracking
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  kurirId: integer("kurir_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  checkInLat: decimal("check_in_lat", { precision: 10, scale: 8 }),
  checkInLng: decimal("check_in_lng", { precision: 11, scale: 8 }),
  checkOutLat: decimal("check_out_lat", { precision: 10, scale: 8 }),
  checkOutLng: decimal("check_out_lng", { precision: 11, scale: 8 }),
  status: text("status").notNull().$type<AttendanceStatus>().default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Package status history for audit trail
export const packageStatusHistory = pgTable("package_status_history", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => packages.id).notNull(),
  fromStatus: text("from_status").$type<PackageStatus>(),
  toStatus: text("to_status").notNull().$type<PackageStatus>(),
  changedBy: integer("changed_by").references(() => users.id),
  location: json("location"), // { lat, lng }
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Salary calculations
export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  kurirId: integer("kurir_id").references(() => users.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  completedDeliveries: integer("completed_deliveries").default(0),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).default("0"),
  deliveryBonus: decimal("delivery_bonus", { precision: 12, scale: 2 }).default("0"),
  totalSalary: decimal("total_salary", { precision: 12, scale: 2 }).default("0"),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Barcode scan logs
export const barcodeScanLogs = pgTable("barcode_scan_logs", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => packages.id).notNull(),
  scannedBy: integer("scanned_by").references(() => users.id).notNull(),
  scanType: text("scan_type").notNull(), // pickup, delivery, etc.
  location: json("location"), // { lat, lng }
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdPackages: many(packages, { relationName: "createdPackages" }),
  assignedPackages: many(packages, { relationName: "assignedPackages" }),
  approvedPackages: many(packages, { relationName: "approvedPackages" }),
  attendance: many(attendance),
  salaryRecords: many(salaryRecords),
  barcodeScanLogs: many(barcodeScanLogs),
  createdGeofenceZones: many(geofenceZones),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  assignedKurir: one(users, {
    fields: [packages.assignedKurirId],
    references: [users.id],
    relationName: "assignedPackages",
  }),
  createdBy: one(users, {
    fields: [packages.createdBy],
    references: [users.id],
    relationName: "createdPackages",
  }),
  approvedBy: one(users, {
    fields: [packages.approvedBy],
    references: [users.id],
    relationName: "approvedPackages",
  }),
  statusHistory: many(packageStatusHistory),
  barcodeScanLogs: many(barcodeScanLogs),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  kurir: one(users, {
    fields: [attendance.kurirId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [attendance.approvedBy],
    references: [users.id],
  }),
}));

export const geofenceZonesRelations = relations(geofenceZones, ({ one }) => ({
  createdBy: one(users, {
    fields: [geofenceZones.createdBy],
    references: [users.id],
  }),
}));

export const packageStatusHistoryRelations = relations(packageStatusHistory, ({ one }) => ({
  package: one(packages, {
    fields: [packageStatusHistory.packageId],
    references: [packages.id],
  }),
  changedBy: one(users, {
    fields: [packageStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const salaryRecordsRelations = relations(salaryRecords, ({ one }) => ({
  kurir: one(users, {
    fields: [salaryRecords.kurirId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [salaryRecords.approvedBy],
    references: [users.id],
  }),
}));

export const barcodeScanLogsRelations = relations(barcodeScanLogs, ({ one }) => ({
  package: one(packages, {
    fields: [barcodeScanLogs.packageId],
    references: [packages.id],
  }),
  scannedBy: one(users, {
    fields: [barcodeScanLogs.scannedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertGeofenceZoneSchema = createInsertSchema(geofenceZones).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertGeofenceZone = z.infer<typeof insertGeofenceZoneSchema>;
export type GeofenceZone = typeof geofenceZones.$inferSelect;
export type Login = z.infer<typeof loginSchema>;
