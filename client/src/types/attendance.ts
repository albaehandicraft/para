// Comprehensive attendance management types
export interface AttendanceRecord {
  id: number;
  kurirId: number;
  kurirName?: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLat: string | null;
  checkInLng: string | null;
  checkOutLat: string | null;
  checkOutLng: string | null;
  status: AttendanceStatus;
  approvedBy: number | null;
  approvedByName?: string;
  notes: string | null;
  createdAt: string;
  workingHours?: number;
  overtime?: number;
  location?: {
    checkIn?: string;
    checkOut?: string;
  };
}

export type AttendanceStatus = "present" | "absent" | "pending" | "approved" | "rejected";

export interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  attendanceRate: number;
  averageWorkingHours: number;
  totalWorkingDays: number;
}

export interface KurirAttendanceSummary {
  kurirId: number;
  kurirName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  pendingDays: number;
  attendanceRate: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
  lateCheckIns: number;
  earlyCheckOuts: number;
}

export interface AttendanceFilters {
  startDate: Date;
  endDate: Date;
  status: AttendanceStatus | "all";
  kurirId: number | "all";
  searchTerm: string;
}

export interface CheckInRequest {
  lat: number;
  lng: number;
  notes?: string;
}

export interface CheckOutRequest {
  lat: number;
  lng: number;
  notes?: string;
}

export interface AttendanceApprovalRequest {
  id: number;
  status: "approved" | "rejected";
  notes?: string;
}

export interface WorkingHoursConfig {
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
  lateThreshold: number; // minutes
  earlyLeaveThreshold: number; // minutes
  overtimeThreshold: number; // minutes
}

export interface AttendanceValidation {
  isValid: boolean;
  message: string;
  warnings?: string[];
}