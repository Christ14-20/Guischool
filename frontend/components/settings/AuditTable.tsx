'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Search } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Input } from '@/components/ui/input';
import { getAuditLogs, type AuditLogItem } from '@/lib/api/settings';

interface AuditTableProps {
  token: string;
}

export function AuditTable({ token }: AuditTableProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;

    async function loadLogs() {
      setLoading(true);
      try {
        const data = await getAuditLogs(token);
        setLogs(data.results);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => 
    log.user_name.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: 'timestamp',
      header: 'Date & Heure',
      accessor: (log) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(log.timestamp), 'Pp', { locale: fr })}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Utilisateur',
      accessor: (log) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{log.user_name}</span>
          <span className="text-[10px] text-muted-foreground">{log.ip_address}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      accessor: (log) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
            {log.action}
          </span>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entité',
      accessor: (log) => <span className="text-sm">{log.entity_name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (log) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={log.description}>
          {log.description}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une action, un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3 w-3" />
          {filteredLogs.length} actions enregistrées
        </div>
      </div>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={filteredLogs}
          rowKey={(log) => log.id}
          loading={loading}
          emptyTitle="Aucun log d'audit"
          emptyDescription="Aucune activité n'a été enregistrée pour le moment."
        />
      </div>
    </div>
  );
}
