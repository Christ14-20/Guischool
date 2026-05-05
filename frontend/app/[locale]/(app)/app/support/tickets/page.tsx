'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Filter,
  RefreshCw,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { TicketPriorityBadge } from '@/components/support/TicketPriorityBadge';
import { NewTicketDialog } from '@/components/support/NewTicketDialog';

import { getTickets, type TicketItem } from '@/lib/api/support';
import { formatDate } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TECHNIQUE: 'Technique',
  FACTURATION: 'Facturation',
  FONCTIONNEL: 'Fonctionnel',
  FEATURE: 'Fonctionnalité',
  BLOCAGE: 'Blocage',
  PAIEMENT: 'Paiement',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'OUVERT', label: 'Ouvert' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'RESOLU', label: 'Résolu' },
  { value: 'FERME', label: 'Fermé' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'FACTURATION', label: 'Facturation' },
  { value: 'FONCTIONNEL', label: 'Fonctionnel' },
  { value: 'FEATURE', label: 'Fonctionnalité' },
  { value: 'BLOCAGE', label: 'Blocage' },
  { value: 'PAIEMENT', label: 'Paiement' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Toutes les priorités' },
  { value: 'BLOQUANT', label: 'Bloquant' },
  { value: 'MAJEUR', label: 'Majeur' },
  { value: 'MINEUR', label: 'Mineur' },
  { value: 'QUESTION', label: 'Question' },
];

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colorClass ?? ''}`}>{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query: Record<string, string | undefined> = {};
      if (statusFilter) query.status = statusFilter;
      if (categoryFilter) query.category = categoryFilter;
      if (priorityFilter) query.priority = priorityFilter;

      const res = await getTickets(token, query);
      setTickets(res.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des tickets.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleRowClick = (id: string | number) => {
    router.push(`/${locale}/app/support/tickets/${id}`);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const total = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OUVERT').length;
  const inProgressCount = tickets.filter((t) => t.status === 'EN_COURS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLU' || t.status === 'FERME').length;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Support & Tickets"
        description="Suivez et gérez vos demandes de support technique et fonctionnel."
        actions={<NewTicketDialog onCreated={loadTickets} />}
      />

      {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total tickets" value={total} />
        <StatsCard label="Ouverts" value={openCount} colorClass="text-sky-600 dark:text-sky-400" />
        <StatsCard label="En cours" value={inProgressCount} colorClass="text-amber-600 dark:text-amber-400" />
        <StatsCard label="Résolus" value={resolvedCount} colorClass="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? '')}>
          <SelectTrigger id="filter-ticket-status" className="h-8 w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value || '__all_status'} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? '')}>
          <SelectTrigger id="filter-ticket-category" className="h-8 w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value || '__all_cat'} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? '')}>
          <SelectTrigger id="filter-ticket-priority" className="h-8 w-[160px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value || '__all_prio'} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter || categoryFilter || priorityFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setCategoryFilter('');
              setPriorityFilter('');
            }}
          >
            Réinitialiser
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={loadTickets}
          title="Actualiser"
          id="btn-refresh-tickets"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">N° Ticket</TableHead>
              <TableHead>Sujet</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Assigné à</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Ticket className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Aucun ticket trouvé.</p>
                    <p className="text-xs">Créez votre premier ticket en cliquant sur « Nouveau ticket ».</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  id={`ticket-row-${ticket.id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(ticket.id)}
                >
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {ticket.ticket_number ?? `#${ticket.id}`}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="truncate font-medium">{ticket.subject}</p>
                    {ticket.message_count != null && (
                      <p className="text-xs text-muted-foreground">
                        {ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(ticket.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ticket.assigned_to_name ?? (
                      <span className="text-xs text-muted-foreground italic">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
