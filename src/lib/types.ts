
export type UserRole = 'admin' | 'staff';
export type AttendanceStatus = 'on-time' | 'late' | 'early-departure' | 'present';
export type MoodRating = 1 | 2 | 3; // 1: Overwhelmed, 2: Hectic, 3: Smooth

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  createdAt: any;
  // Location for Geofencing
  latitude?: number;
  longitude?: number;
  radiusInMeters?: number;
}

export interface UserProfile {
  uid: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt: any;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  organizationId: string;
  date: string; // YYYY-MM-DD
  clockInTime: string | null;
  clockOutTime: string | null;
  status: AttendanceStatus;
  handoverNotes: string | null;
  moodRating: MoodRating | null;
  // Security metadata
  verifiedLocation?: {
    lat: number;
    lng: number;
  };
}
