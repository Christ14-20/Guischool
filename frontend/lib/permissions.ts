/**
 * lib/permissions.ts
 *
 * RBAC côté frontend — reflète strictement les codenames vérifiés côté
 * backend via `HasPermission("...")` (core/permissions.py). Source de
 * vérité : GET /auth/permissions/me/, embarqué dans la session NextAuth
 * (voir auth.ts) sous `session.user.permissions: string[]`.
 *
 * Ne PAS inventer de nouveaux codenames ici — chaque constante doit
 * correspondre à un `HasPermission("...")` réellement présent dans un
 * ViewSet du backend, sous peine de gater une action qui n'est en fait pas
 * protégée (ou l'inverse : afficher un bouton qui renverra 403).
 */

export const PERMISSIONS = {
  // Personnel (apps.authentication.views.StaffViewSet)
  STAFF_READ: "staff:read",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DISABLE: "staff:disable",
  TEACHERS_READ: "authentication:read:teachers",

  // Pédagogie (apps.pedagogy.views)
  SCHOOLYEAR_CREATE: "pedagogy:create:schoolyear", // aussi réutilisé pour classes/matières (Class/Subject/ClassSubject ViewSets)
  SCHOOLYEAR_UPDATE: "pedagogy:update:schoolyear", // set-current
  SCHOOLYEAR_CLOSE: "pedagogy:close:schoolyear",
  SCHOOLYEAR_OVERRIDE: "pedagogy:override:schoolyear",
  PERIOD_CREATE: "pedagogy:create:period", // aussi réutilisé pour la clôture d'une période

  // Élèves
  ELEVES_READ: "eleves:read",
  ELEVES_CREATE: "eleves:create",
  ELEVES_UPDATE: "eleves:update", // modification, réinscription, archivage

  // Présences
  ATTENDANCE_CREATE: "attendance:create", // saisie + correction
  ATTENDANCE_JUSTIFY: "attendance:justify",

  // Notes
  NOTES_CREATE_EVALUATION: "notes:create:evaluation", // création d'évaluation + saisie en masse des notes
  NOTES_READ: "notes:read", // aussi requis pour bulletin/moyenne d'un élève et pour lire les décisions de fin d'année
  NOTES_LOCK: "notes:lock",
  NOTES_VALIDATE: "notes:validate", // validation/correction de note + décisions de fin d'année

  // Finance
  FINANCE_READ: "finance:read",
  FINANCE_CREATE: "finance:create",
  FINANCE_UPDATE: "finance:update", // inclut suppression d'une catégorie de frais et génération de PDF facture

  // Communication
  COMMUNICATION_SEND: "communication:send",
} as const;

export type PermissionCodename = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Vérifie qu'un codename est présent dans l'ensemble effectif de permissions. */
export function hasPermission(
  permissions: string[] | undefined | null,
  codename: string
): boolean {
  return !!permissions?.includes(codename);
}

/** Vrai si au moins un des codenames est présent. */
export function hasAnyPermission(
  permissions: string[] | undefined | null,
  codenames: string[]
): boolean {
  return codenames.some((c) => hasPermission(permissions, c));
}

/** Vrai si tous les codenames sont présents. */
export function hasAllPermissions(
  permissions: string[] | undefined | null,
  codenames: string[]
): boolean {
  return codenames.every((c) => hasPermission(permissions, c));
}
