import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

type StatusBadgeProps = {
  status: string;
  variant?: StatusBadgeTone;
  className?: string;
};

const SUCCESS_STATUSES = new Set([
  "ACTIF",
  "ADMIS",
  "PAYE",
  "PAID",
  "ACTIVE",
  "RESOLU",
  "COMPLETED",
  "APPROVED",
  "APPROUVEE",
]);
const DANGER_STATUSES = new Set([
  "SUSPENDU",
  "EXCLU",
  "OVERDUE",
  "SUSPENDED",
  "FERME",
  "BLOQUANT",
  "CLOTUREE",
  "REJECTED",
  "REJETEE",
  "INACTIVE",
  "CRITICAL",
]);
const WARNING_STATUSES = new Set([
  "TRIAL",
  "BROUILLON",
  "EN_RETARD",
  "EN_ATTENTE",
  "PENDING",
  "PREPARATION",
  "CLOTURE_EN_COURS",
  "INVITED",
  "WARNING",
]);
const INFO_STATUSES = new Set([
  "EN_COURS",
  "OUVERT",
  "OUVERTE",
  "PROCESSING",
  "INFO",
]);

const toneClasses: Record<StatusBadgeTone, string> = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  neutral: "bg-muted text-muted-foreground",
};

function normalizeStatus(status: string) {
  if (!status) return "";
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function detectTone(status: string): StatusBadgeTone {
  const normalized = normalizeStatus(status);

  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (DANGER_STATUSES.has(normalized)) return "danger";
  if (WARNING_STATUSES.has(normalized)) return "warning";
  if (INFO_STATUSES.has(normalized)) return "info";
  return "neutral";
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const tone = variant ?? detectTone(status);

  return (
    <Badge className={cn("capitalize", toneClasses[tone], className)}>
      {status}
    </Badge>
  );
}
