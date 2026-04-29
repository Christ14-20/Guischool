'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  type FeeCategoryItem,
} from '@/lib/api/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { ROLES } from '@/lib/constants';

const FEE_TYPES = [
  { value: 'TUITION', label: 'Scolarité' },
  { value: 'REGISTRATION', label: 'Inscription' },
  { value: 'CANTEEN', label: 'Cantine' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'UNIFORM', label: 'Uniforme' },
  { value: 'SUPPLIES', label: 'Fournitures' },
  { value: 'TRIP', label: 'Sortie scolaire' },
  { value: 'OTHER', label: 'Autre' },
];

const feeSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  type: z.string().min(1, 'Le type est requis.'),
  amount: z.coerce.number().min(0, 'Le montant doit être positif.'),
  is_mandatory: z.boolean().default(true),
  installments: z.array(
    z.object({
      date: z.string().min(1, 'La date est requise.'),
      amount: z.coerce.number().min(0, 'Le montant doit être positif.'),
    })
  ),
});

type FeeFormValues = z.infer<typeof feeSchema>;

export default function FeeCategoriesPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const [categories, setCategories] = useState<FeeCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const canManage = useRole([ROLES.ADMIN_SCHOOL, ROLES.SUPER_ADMIN]);

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema) as any,
    defaultValues: {
      name: '',
      type: 'TUITION',
      amount: 0,
      is_mandatory: true,
      installments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  const loadCategories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getFeeCategories(token);
      setCategories(data.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des catégories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openSheet = (category?: FeeCategoryItem) => {
    if (category) {
      setEditingId(category.id);
      form.reset({
        name: category.name,
        type: category.type,
        amount: Number(category.amount),
        is_mandatory: category.is_mandatory,
        installments: category.installments || [],
      });
    } else {
      setEditingId(null);
      form.reset({
        name: '',
        type: 'TUITION',
        amount: 0,
        is_mandatory: true,
        installments: [],
      });
    }
    setSheetOpen(true);
  };

  const onSubmit = async (values: FeeFormValues) => {
    if (!token) return;
    try {
      if (editingId) {
        await updateFeeCategory(token, editingId, values);
        toast.success('Catégorie modifiée.');
      } else {
        await createFeeCategory(token, values);
        toast.success('Catégorie créée.');
      }
      setSheetOpen(false);
      loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await deleteFeeCategory(token, id);
      toast.success('Catégorie supprimée.');
      loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de supprimer cette catégorie (elle est peut-être déjà utilisée).');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Catégories de Frais"
        description="Gérez les types de frais (Scolarité, Inscription, etc.) et leurs échéanciers."
        actions={
          canManage && (
            <Button onClick={() => openSheet()}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie
            </Button>
          )
        }
      />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-center">Échéances</TableHead>
              <TableHead className="text-center">Obligatoire</TableHead>
              {canManage && <TableHead className="w-[100px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aucune catégorie de frais.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    {FEE_TYPES.find((t) => t.value === cat.type)?.label || cat.type}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(cat.amount)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {cat.installments?.length || 0} tranche(s)
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={cat.is_mandatory} disabled />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openSheet(cat)}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <ConfirmDialog
                          title="Supprimer la catégorie"
                          description={`Êtes-vous sûr de vouloir supprimer "${cat.name}" ?`}
                          variant="destructive"
                          trigger={
                            <Button variant="ghost" size="icon-xs">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          onConfirm={() => handleDelete(cat.id)}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</SheetTitle>
            <SheetDescription>
              Définissez le montant total et les éventuelles échéances de paiement.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la catégorie *</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Frais de Scolarité 1ère année" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FEE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant total (GNF) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_mandatory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Frais obligatoire</FormLabel>
                        <FormDescription>
                          Appliqué automatiquement à tous les élèves.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Échéancier (Installments) */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Échéancier de paiement</h4>
                      <p className="text-[13px] text-muted-foreground">Ajoutez des tranches si le paiement est fractionné.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ date: '', amount: 0 })}>
                      <Plus className="mr-1 h-3 w-3" /> Ajouter
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <FormField
                        control={form.control}
                        name={`installments.${index}.date`}
                        render={({ field: fField }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="date" {...fField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`installments.${index}.amount`}
                        render={({ field: fField }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="number" placeholder="Montant" {...fField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {fields.length > 0 && (
                    <div className="text-xs text-muted-foreground text-right mt-2">
                      Total des tranches : {formatCurrency(form.watch('installments').reduce((sum, inst) => sum + Number(inst.amount || 0), 0))}
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="mt-8">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
