import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketPriority } from '@/lib/api/support';

type PriorityBadgeProps = {
  priority: TicketPriority;
  className?: string;
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  BLOQUANT: {
    label: 'Bloquant',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  },
  MAJEUR: {
    label: 'Majeur',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  },
  MINEUR: {
    label: 'Mineur',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  },
  QUESTION: {
    label: 'Question',
    className: 'bg-muted text-muted-foreground',
  },
};

export function TicketPriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority?.toUpperCase?.()] ?? {
    label: priority ?? '—',
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
