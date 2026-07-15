export type UserRole =
  | "SUPER_ADMIN"
  | "DIRECTOR"
  | "STUDENT_STUDIES"
  | "TEACHER"
  | "PARENT";

export interface Permission {
  codename: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  permissions: string[];
  tenant_id: string | null;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}
