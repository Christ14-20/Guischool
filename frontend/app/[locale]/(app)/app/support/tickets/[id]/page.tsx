'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { TicketPriorityBadge } from '@/components/support/TicketPriorityBadge';

import {
  getTicket,
  getTicketMessages,
  addTicketMessage,
  updateTicket,
  type TicketItem,
  type TicketMessage,
} from '@/lib/api/support';
import { formatDate } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { ROLES } from '@/lib/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TECHNIQUE: 'Technique',
  FACTURATION: 'Facturation',
  FONCTIONNEL: 'Fonctionnel',
  FEATURE: 'Demande de fonctionnalité',
  BLOCAGE: 'Blocage',
  PAIEMENT: 'Paiement',
};

const STATUS_OPTIONS = [
  { value: 'OUVERT', label: '🟢 Ouvert' },
  { value: 'EN_COURS', label: '🔵 En cours' },
  { value: 'EN_ATTENTE', label: '🟡 En attente' },
  { value: 'RESOLU', label: '✅ Résolu' },
  { value: 'FERME', label: '⛔ Fermé' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => c[0]?.toUpperCase())
    .join('');
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr });
  } catch {
    return dateStr;
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: TicketMessage; isOwn: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {getInitials(msg.author_name)}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-baseline gap-2">
          {!isOwn && (
            <span className="text-xs font-semibold text-foreground">{msg.author_name ?? 'Anonyme'}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isOwn
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-muted text-foreground'
          }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'fr';
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = useRole([ROLES.ADMIN_SCHOOL, ROLES.SUPER_ADMIN]);

  // ─── Load ticket info ──────────────────────────────────────────────────────
  const loadTicket = useCallback(async () => {
    if (!token || !ticketId) return;
    try {
      const t = await getTicket(token, ticketId);
      setTicket(t);
    } catch (error) {
      toast.error('Impossible de charger le ticket.');
    } finally {
      setLoadingTicket(false);
    }
  }, [token, ticketId]);

  // ─── Load messages (also used for polling) ────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!token || !ticketId) return;
    try {
      const res = await getTicketMessages(token, ticketId);
      setMessages(res.results);
    } catch {
      // Silent fail pour le polling
    } finally {
      setLoadingMessages(false);
    }
  }, [token, ticketId]);

  useEffect(() => {
    loadTicket();
    loadMessages();
  }, [loadTicket, loadMessages]);

  // Polling toutes les 30s
  useEffect(() => {
    pollingRef.current = setInterval(loadMessages, 30_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadMessages]);

  // Scroll to bottom quand les messages changent
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Send reply ────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyText.trim() || !token) return;
    setSending(true);
    try {
      const msg = await addTicketMessage(token, ticketId, replyText.trim());
      setMessages((prev) => [...prev, msg]);
      setReplyText('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi du message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // ─── Change status ────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!token || !ticket) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateTicket(token, ticket.id, { status: newStatus });
      setTicket(updated);
      toast.success('Statut mis à jour.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingTicket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-muted-foreground">
        <XCircle className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Ticket introuvable.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === 'FERME' || ticket.status === 'RESOLU';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 pb-4">

      {/* ─── Back button ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/app/support/tickets`)}
          id="btn-back-tickets"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux tickets
        </Button>
      </div>

      {/* ─── Header card ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: title + meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                {ticket.ticket_number ?? `#${ticket.id}`}
              </span>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[ticket.category] ?? ticket.category}
              </Badge>
              <TicketPriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <h1 className="text-xl font-bold leading-snug">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCircle2 className="h-3.5 w-3.5" />
                {ticket.created_by_name ?? 'Inconnu'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(ticket.created_at)}
              </span>
              {ticket.assigned_to_name && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Assigné à <strong>{ticket.assigned_to_name}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Right: admin actions */}
          {isAdmin && (
            <div className="shrink-0">
              <Select
                value={ticket.status}
                onValueChange={(v) => v && handleStatusChange(v)}
                disabled={updatingStatus}
              >
                <SelectTrigger id="select-ticket-status-admin" className="w-[170px]">
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Original description */}
        <Separator className="my-4" />
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description initiale
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
        </div>
      </div>

      {/* ─── Discussion thread ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-3">
          <p className="text-sm font-semibold">
            Discussion
            {messages.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({messages.length} message{messages.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>

        {/* Messages scroll area */}
        <ScrollArea className="flex-1 px-5 py-4">
          <div ref={scrollRef} className="space-y-4">
            {loadingMessages ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-12 w-60 rounded-2xl" />
                  </div>
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Send className="h-8 w-8 opacity-30" />
                <p className="text-sm">Aucun message pour l'instant.</p>
                <p className="text-xs">Soyez le premier à répondre à ce ticket.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={String(msg.author) === String(session?.user?.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Reply form */}
        <div className="border-t p-4">
          {isClosed ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Ce ticket est fermé. Ouvrez un nouveau ticket si vous avez d'autres questions.
            </div>
          ) : (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-2">
                <Textarea
                  id="textarea-reply"
                  placeholder="Écrivez votre réponse… (Ctrl+Entrée pour envoyer)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[80px] resize-none"
                  disabled={sending}
                />
                <div className="flex justify-end">
                  <Button
                    id="btn-send-reply"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    size="sm"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
