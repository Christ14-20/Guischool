'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';

import { getInvoices, type InvoiceItem } from '@/lib/api/finance';
import { getStudents, type StudentItem } from '@/lib/api/students';
import { getSchoolYears, type SchoolYearItem } from '@/lib/api/pedagogy';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { ROLES } from '@/lib/constants';

export default function InvoicesPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string;
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtres
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const canManage = useRole([ROLES.ADMIN_SCHOOL, ROLES.SUPER_ADMIN]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [invRes, studRes, yearRes] = await Promise.all([
        getInvoices(token, {
          ...(filterStudent !== 'all' ? { student: filterStudent } : {}),
          ...(filterYear !== 'all' ? { school_year: filterYear } : {}),
          ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
        }),
        getStudents(token),
        getSchoolYears(token),
      ]);
      setInvoices(invRes.results || []);
      setStudents(studRes.results || []);
      setSchoolYears(yearRes.results || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, filterStudent, filterYear, filterStatus]);

  const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.total_due), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.total_paid), 0);
  const totalBalance = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Gestion de la facturation des élèves"
      />

      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-md border shadow-sm">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Élève
          </label>
          <Select value={filterStudent} onValueChange={(v) => setFilterStudent(v || 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les élèves" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les élèves</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name} ({s.matricule || 'N/A'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Année Scolaire
          </label>
          <Select value={filterYear} onValueChange={(v) => setFilterYear(v || 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les années" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {schoolYears.map((y) => (
                <SelectItem key={y.id} value={y.id.toString()}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Statut
          </label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PAID">Payée</SelectItem>
              <SelectItem value="OVERDUE">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => {
          setFilterStudent('all');
          setFilterYear('all');
          setFilterStatus('all');
        }}>
          Réinitialiser
        </Button>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date Création</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead className="text-right">Total Dû</TableHead>
              <TableHead className="text-right">Total Payé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chargement des factures...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune facture trouvée.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{formatDate(inv.created_at || '')}</TableCell>
                  <TableCell className="font-medium">{inv.student_name || 'Élève inconnu'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.total_due)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(inv.total_paid)}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{formatCurrency(inv.balance)}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      title="Voir le détail"
                      onClick={() => router.push(`/app/finance/invoices/${inv.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Totaux */}
        {!loading && invoices.length > 0 && (
          <div className="bg-muted/50 p-4 border-t flex justify-end gap-6 text-sm">
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground">Dû</span>
              <span className="font-medium">{formatCurrency(totalDue)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground">Payé</span>
              <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground">Solde Restant</span>
              <span className="font-bold text-red-600">{formatCurrency(totalBalance)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
