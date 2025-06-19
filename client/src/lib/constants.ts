export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin', 
  PIC: 'pic',
  KURIR: 'kurir'
} as const;

export const PACKAGE_STATUSES = {
  CREATED: 'created',
  ASSIGNED: 'assigned', 
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed'
} as const;

export const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const SCAN_TYPES = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery'
} as const;

export const PRIORITY_LEVELS = {
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me'
  },
  USERS: '/api/users',
  PACKAGES: '/api/packages',
  ATTENDANCE: '/api/attendance',
  GEOFENCE: '/api/geofence',
  BARCODE: '/api/barcode',
  DASHBOARD: '/api/dashboard'
} as const;
