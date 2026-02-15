export type Role = 'admin' | 'doctor' | 'receptionist' | 'pharmacy' | 'manager';

export interface AuthClaims {
  clinicId: string;
  role: Role;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  clinicId: string;
  active: boolean;
  mustChangePassword?: boolean;
}
