"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";

import {
  getInvoiceDetails,
  getPayments,
  generateInvoicePdf,
  type InvoiceItem,
  type PaymentItem,
} from "@/lib/api/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { ROLES } from "@/lib/constants";

export default function InvoiceDetailsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canManage = useRole([ROLES.ADMIN_SCHOOL, ROLES.SUPER_ADMIN]);

  useEffect(() => {
    const loadData = async () => {
      if (!token || !id) return;
      setLoading(true);
      try {
        const inv = await getInvoiceDetails(token, id);
        setInvoice(inv);

        // Récupérer l'historique des paiements de cet élève
        const pays = await getPayments(token, { student: inv.student });
        setPayments(pays.results || []);
      } catch {
        toast.error("Erreur lors du chargement de la facture.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, id]);

  const handleGeneratePdf = async () => {
    if (!token || !id) return;
    setGenerating(true);
    try {
      const res = await generateInvoicePdf(token, id);
      toast.success(res.message || "Génération PDF lancée.");
    } catch {
      toast.error("Erreur lors de la génération du PDF.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Chargement des détails...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-red-500">Facture introuvable.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`Facture — ${invoice.student_name || invoice.student}`}
          description={`Année Scolaire ID: ${invoice.school_year}`}
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
          {canManage && (
            <Button onClick={handleGeneratePdf} disabled={generating}>
              <Download className="h-4 w-4 mr-2" />
              {generating ? "Génération..." : "Générer PDF"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Résumé Facture */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border rounded-md p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-semibold text-lg text-card-foreground">
                Résumé
              </h3>
              <StatusBadge status={invoice.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Élève :</span>
                <span className="font-medium">
                  {invoice.student_name || invoice.student}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Création :</span>
                <span className="font-medium">
                  {formatDate(invoice.created_at || "")}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">Total Dû :</span>
                <span className="font-medium">
                  {formatCurrency(invoice.total_due)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payé :</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.total_paid)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t text-base">
                <span className="text-muted-foreground font-medium">
                  Solde Restant :
                </span>
                <span className="font-bold text-red-600">
                  {formatCurrency(invoice.balance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Historique Paiements */}
        <div className="md:col-span-2">
          <div className="bg-card border rounded-md shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold text-card-foreground">
                Historique des Paiements (Élève)
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>N° Reçu</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Aucun paiement enregistré pour cet élève.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.payment_date)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.receipt_number || p.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
