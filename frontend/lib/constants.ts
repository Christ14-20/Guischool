// Constantes métiers de base

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_SCHOOL: 'ADMIN_SCHOOL',
  SECRETAIRE: 'SECRETAIRE',
  ENSEIGNANT: 'ENSEIGNANT',
  PARENT: 'PARENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TRIAL: 'TRIAL',
  CANCELLED: 'CANCELLED',
} as const;

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Permissions disponibles dans l'application
export const PERMISSIONS = {
  // Élèves
  STUDENT_VIEW: 'student:view',
  STUDENT_CREATE: 'student:create',
  STUDENT_EDIT: 'student:edit',
  STUDENT_DELETE: 'student:delete',
  // Notes
  GRADE_VIEW: 'grade:view',
  GRADE_CREATE: 'grade:create',
  GRADE_BULK: 'grade:bulk',
  // Finance
  FINANCE_VIEW: 'finance:view',
  FINANCE_CREATE: 'finance:create',
  FINANCE_EDIT: 'finance:edit',
  // Paramètres
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  // Fin d'année
  YEAR_END_MANAGE: 'year-end:manage',
  // Superadmin
  SUPERADMIN_ACCESS: 'superadmin:access',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Mapping rôle → permissions accordées
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],
  ADMIN_SCHOOL: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.GRADE_VIEW,
    PERMISSIONS.GRADE_CREATE,
    PERMISSIONS.GRADE_BULK,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_CREATE,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.YEAR_END_MANAGE,
  ],
  SECRETAIRE: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.GRADE_VIEW,
    PERMISSIONS.GRADE_BULK,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_CREATE,
    PERMISSIONS.FINANCE_EDIT,
  ],
  ENSEIGNANT: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.GRADE_VIEW,
    PERMISSIONS.GRADE_CREATE,
  ],
  PARENT: [
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.GRADE_VIEW,
    PERMISSIONS.FINANCE_VIEW,
  ],
};
