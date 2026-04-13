 'use client';

import { Inbox } from 'lucide-react';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { type Permission } from '@/lib/constants';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionPermission?: Permission;
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionPermission,
  className,
}: EmptyStateProps) {
  const actionNode = actionPermission ? (
    <PermissionGate permission={actionPermission}>{action}</PermissionGate>
  ) : (
    action
  );

  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center',
        className
      )}
    >
      <div className="rounded-full bg-secondary p-3 text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actionNode ? <div>{actionNode}</div> : null}
    </div>
  );
}
