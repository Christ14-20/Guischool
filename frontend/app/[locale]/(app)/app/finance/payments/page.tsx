"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import dynamic from "next/dynamic";

import {
  getPayments,
  createPayment,
  getStudentFees,
  type PaymentItem,
  type StudentFeeItem,
} from "@/lib/api/finance";
import { getStudents, type StudentItem } from "@/lib/api/students";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { ROLES } from "@/lib/constants";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Espèces" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MTN_MONEY", label: "MTN MoMo" },
  { value: "WAVE", label: "Wave" },
  { value: "BANK_TRANSFER", label: "Virement" },
  { value: "CHECK", label: "Chèque" },
];

const DynamicReceiptViewer = dynamic(
  () => import("@/components/finance/ReceiptPDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Chargement du visualiseur PDF...
      </div>
    ),
  },
);

const paymentSchema = z.object({
  student: z.string().min(1, "L'élève est requis."),
  student_fee: z.string().optional(),
  amount: z.coerce.number().min(1, "Le montant doit être supérieur à 0."),
  payment_date: z.string().min(1, "La date est requise."),
  method: z.string().min(1, "Le mode de paiement est requis."),
  reference: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printPayment, setPrintPayment] = useState<PaymentItem | null>(null);

  const canManage = useRole([ROLES.ADMIN_SCHOOL, ROLES.SUPER_ADMIN]);

  const form = useForm<PaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      student: "",
      student_fee: "",
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      method: "CASH",
      reference: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedStudent = form.watch("student");

  useEffect(() => {
    const fetchFees = async () => {
      if (!token || !selectedStudent) {
        setStudentFees([]);
        return;
      }
      try {
        const res = await getStudentFees(token, { student: selectedStudent });
        setStudentFees(res.results);
      } catch (e) {
        console.error("Erreur chargement frais:", e);
      }
    };
    fetchFees();
  }, [token, selectedStudent]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [paymentsRes, studentsRes] = await Promise.all([
        getPayments(token),
        getStudents(token, { page_size: 500 }), // Limite pour la démo, utiliser un vrai combobox en prod
      ]);
      setPayments(paymentsRes.results);
      setStudents(studentsRes.results);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du chargement.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (!token) return;
    try {
      const newPayment = await createPayment(token, values);
      toast.success("Paiement enregistré avec succès.");
      setDialogOpen(false);
      form.reset();
      loadData();
      // Ouvre automatiquement le reçu pour l'impression après succès
      setPrintPayment(newPayment);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la sauvegarde.",
      );
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Paiements & Encaissements"
        description="Consultez l'historique des transactions et enregistrez de nouveaux paiements."
        actions={
          canManage && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nouvel encaissement
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total encaissé
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Nombre de paiements
          </p>
          <p className="mt-2 text-2xl font-bold">{payments.length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>N° Reçu</TableHead>
              <TableHead>Élève</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Frais concerné</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Chargement...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun paiement trouvé.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.receipt_number || "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.student_name || "—"}
                  </TableCell>
                  <TableCell>
                    {PAYMENT_METHODS.find((m) => m.value === payment.method)
                      ?.label || payment.method}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground italic">
                    {payment.student_fee_name || "Général"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Imprimer le reçu"
                      onClick={() => setPrintPayment(payment)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nouvel encaissement</DialogTitle>
            <DialogDescription>
              Enregistrez un paiement pour un élève spécifique. Le N° de reçu
              sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-4"
            >
              <FormField
                control={form.control}
                name="student"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Élève *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un élève" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((stu) => (
                          <SelectItem key={stu.id} value={String(stu.id)}>
                            {stu.first_name} {stu.last_name} ({stu.matricule})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {studentFees.length > 0 && (
                <FormField
                  control={form.control}
                  name="student_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frais concerné</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez le frais à payer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {studentFees.map((fee) => (
                            <SelectItem key={fee.id} value={String(fee.id)}>
                              {fee.fee_category_name} (Solde:{" "}
                              {formatCurrency(fee.balance_due)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (GNF) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de paiement *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence</FormLabel>
                      <FormControl>
                        <Input placeholder="N° transaction..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Validation..." : "Encaisser"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!printPayment}
        onOpenChange={(open) => !open && setPrintPayment(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
          <div className="flex-1 w-full p-4">
            {printPayment && <DynamicReceiptViewer payment={printPayment} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
