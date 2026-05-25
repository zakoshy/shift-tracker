
export type UserRole = 'admin' | 'staff' | 'super-admin';
export type AttendanceStatus = 'on-time' | 'late' | 'early-departure' | 'present' | 'overtime';
export type MoodRating = 1 | 2 | 3; // 1: Stressed, 2: Hectic, 3: Smooth

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  createdAt: any;
  latitude?: number;
  longitude?: number;
  radiusInMeters?: number;
  overtimeEnabled: boolean;
  suspended?: boolean;
}

export interface UserProfile {
  uid: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  shiftStart?: string; // HH:mm
  shiftEnd?: string;   // HH:mm
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
  overtimeMinutes?: number;
  verifiedAt?: string;
  manualOverride?: boolean;
  verifiedLocation?: {
    lat: number;
    lng: number;
  };
}
