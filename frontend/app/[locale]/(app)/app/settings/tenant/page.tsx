'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Building2,
  Globe2,
  GraduationCap,
  Loader2,
  Puzzle,
  Save,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getTenantSettings,
  updateTenantSettings,
  type TenantSettings,
} from '@/lib/api/tenant-settings';

const EDUCATION_CYCLES = [
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
  { value: 'CQP', label: 'CQP' },
  { value: 'COLLEGE', label: 'Collège' },
  { value: 'LYCEE_GEN', label: 'Lycée Général' },
  { value: 'LYCEE_TECH', label: 'Lycée Technique' },
  { value: 'ETFP_A', label: 'ETFP A' },
  { value: 'ETFP_B', label: 'ETFP B' },
  { value: 'SUPERIEUR', label: 'Supérieur' },
];

const EXAM_TYPES = [
  { value: 'CEP', label: 'CEP' },
  { value: 'BEPC', label: 'BEPC' },
  { value: 'BAC', label: 'BAC' },
  { value: 'CAP', label: 'CAP' },
  { value: 'BT', label: 'BT' },
  { value: 'BTS', label: 'BTS' },
  { value: 'DEF', label: 'DEF' },
  { value: 'PROBAC', label: 'PROBAC' },
];

const MODULE_FIELDS: Array<{
  key: keyof TenantSettings;
  label: string;
  description: string;
}> = [
  { key: 'has_internat', label: 'Internat', description: 'Gestion du dortoir et de la vie interne.' },
  { key: 'has_transport', label: 'Transport', description: 'Bus scolaires et circuits de ramassage.' },
  { key: 'has_cantine', label: 'Cantine', description: 'Restauration scolaire et menus.' },
  { key: 'has_bibliotheque', label: 'Bibliothèque', description: 'Catalogue et prêts de livres.' },
  { key: 'has_labo', label: 'Laboratoire', description: 'Salles de sciences et équipements.' },
  { key: 'has_official_exams', label: 'Examens officiels', description: 'Préparation aux examens nationaux.' },
  { key: 'has_payroll', label: 'Paie', description: 'Gestion des salaires du personnel.' },
  { key: 'has_whatsapp', label: 'WhatsApp', description: 'Notifications parents via WhatsApp.' },
  { key: 'has_offline_advanced', label: 'Offline avancé', description: 'Synchronisation LAN et mode déconnecté.' },
  { key: 'has_predictive_analytics', label: 'Analytique prédictive', description: 'Alertes et prévisions de réussite.' },
];

type FormState = {
  name: string;
  code_minedu: string;
  nif: string;
  registre_commerce: string;
  timezone: string;
  date_format: string;
  first_day_week: string;
  default_lang: string;
  default_currency: string;
  education_system: string;
  active_levels: string[];
  exams_prepared: string[];
  has_internat: boolean;
  has_transport: boolean;
  has_cantine: boolean;
  has_bibliotheque: boolean;
  has_labo: boolean;
  has_official_exams: boolean;
  has_payroll: boolean;
  has_whatsapp: boolean;
  has_offline_advanced: boolean;
  has_predictive_analytics: boolean;
};

function settingsToForm(data: TenantSettings): FormState {
  return {
    name: data.name ?? '',
    code_minedu: data.code_minedu ?? '',
    nif: data.nif ?? '',
    registre_commerce: data.registre_commerce ?? '',
    timezone: data.timezone ?? 'Africa/Conakry',
    date_format: data.date_format ?? 'DD/MM/YYYY',
    first_day_week: String(data.first_day_week ?? 1),
    default_lang: data.default_lang ?? 'fr',
    default_currency: data.default_currency ?? 'GNF',
    education_system: data.education_system ?? 'GUINEEN',
    active_levels: data.active_levels ?? [],
    exams_prepared: data.exams_prepared ?? [],
    has_internat: data.has_internat ?? false,
    has_transport: data.has_transport ?? false,
    has_cantine: data.has_cantine ?? false,
    has_bibliotheque: data.has_bibliotheque ?? false,
    has_labo: data.has_labo ?? false,
    has_official_exams: data.has_official_exams ?? false,
    has_payroll: data.has_payroll ?? false,
    has_whatsapp: data.has_whatsapp ?? false,
    has_offline_advanced: data.has_offline_advanced ?? false,
    has_predictive_analytics: data.has_predictive_analytics ?? false,
  };
}

export default function TenantSettingsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!token) return;
    async function load() {
      setLoading(true);
      try {
        const data = await getTenantSettings(token);
        setSettings(data);
        setForm(settingsToForm(data));
      } catch {
        toast.error('Impossible de charger la configuration.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const toggleListValue = (field: 'active_levels' | 'exams_prepared', value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleSave = async () => {
    if (!token || !form) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        first_day_week: Number(form.first_day_week),
        logo: logoFile,
      };
      const updated = await updateTenantSettings(token, payload);
      setSettings(updated);
      setForm(settingsToForm(updated));
      setLogoFile(null);
      toast.success('Configuration enregistrée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form || !settings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Configuration de l'établissement"
        description="Paramètres maîtres : identité, localisation, pédagogie et modules activés."
      />

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-max lg:grid-cols-4">
          <TabsTrigger value="identity" className="gap-2">
            <Building2 className="h-4 w-4" /> Identité
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe2 className="h-4 w-4" /> Localisation
          </TabsTrigger>
          <TabsTrigger value="education" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Éducation
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <Puzzle className="h-4 w-4" /> Modules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identité de l'établissement</CardTitle>
              <CardDescription>Logo, nom et informations légales (MINEDU, NIF).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-8 lg:flex-row">
                <div className="w-full lg:w-1/3">
                  <Label className="mb-2 block">Logo</Label>
                  {settings.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logo_url}
                      alt="Logo établissement"
                      className="mb-3 h-24 w-24 rounded-lg border object-cover"
                    />
                  ) : null}
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    PNG, JPG ou WebP. Le logo sera enregistré lors de la sauvegarde.
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'école</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="code_minedu">Code MINEDU</Label>
                      <Input
                        id="code_minedu"
                        value={form.code_minedu}
                        onChange={(e) => setForm({ ...form, code_minedu: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nif">NIF</Label>
                      <Input
                        id="nif"
                        value={form.nif}
                        onChange={(e) => setForm({ ...form, nif: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registre_commerce">Registre de commerce</Label>
                    <Input
                      id="registre_commerce"
                      value={form.registre_commerce}
                      onChange={(e) => setForm({ ...form, registre_commerce: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localization">
          <Card>
            <CardHeader>
              <CardTitle>Localisation et formats</CardTitle>
              <CardDescription>Fuseau horaire, langue, format de date et devise.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select
                  value={form.date_format}
                  onValueChange={(value) => setForm({ ...form, date_format: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">JJ/MM/AAAA</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/JJ/AAAA</SelectItem>
                    <SelectItem value="YYYY-MM-DD">AAAA-MM-JJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Premier jour de la semaine</Label>
                <Select
                  value={form.first_day_week}
                  onValueChange={(value) => setForm({ ...form, first_day_week: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lundi</SelectItem>
                    <SelectItem value="0">Dimanche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Langue par défaut</Label>
                <Select
                  value={form.default_lang}
                  onValueChange={(value) => setForm({ ...form, default_lang: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  value={form.default_currency}
                  onValueChange={(value) => setForm({ ...form, default_currency: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GNF">Franc guinéen (GNF)</SelectItem>
                    <SelectItem value="USD">Dollar US (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres éducatifs</CardTitle>
              <CardDescription>Système scolaire, cycles actifs et examens préparés.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Système éducatif</Label>
                <Select
                  value={form.education_system}
                  onValueChange={(value) => setForm({ ...form, education_system: value })}
                >
                  <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUINEEN">Guinéen</SelectItem>
                    <SelectItem value="FRANCO_ARABE">Franco-arabe</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="MIXTE">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Niveaux actifs</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {EDUCATION_CYCLES.map((cycle) => (
                    <label key={cycle.value} className="flex items-center gap-2 rounded-lg border p-3">
                      <Checkbox
                        checked={form.active_levels.includes(cycle.value)}
                        onCheckedChange={() => toggleListValue('active_levels', cycle.value)}
                      />
                      <span className="text-sm">{cycle.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Examens préparés</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {EXAM_TYPES.map((exam) => (
                    <label key={exam.value} className="flex items-center gap-2 rounded-lg border p-3">
                      <Checkbox
                        checked={form.exams_prepared.includes(exam.value)}
                        onCheckedChange={() => toggleListValue('exams_prepared', exam.value)}
                      />
                      <span className="text-sm">{exam.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Modules activables</CardTitle>
              <CardDescription>
                Plan actuel : <Badge variant="outline">{settings.plan_name ?? 'Non défini'}</Badge>
                {' '}— Les modules grisés nécessitent une mise à niveau du plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODULE_FIELDS.map((module) => {
                const availability = settings.module_availability?.[module.key];
                const available = availability?.available ?? false;
                const checked = form[module.key] as boolean;

                return (
                  <div
                    key={module.key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{module.label}</p>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                      {!available ? (
                        <p className="mt-1 text-xs text-amber-600">
                          Requiert le module plan « {availability?.required_plan_module} »
                        </p>
                      ) : null}
                    </div>
                    <Switch
                      checked={checked}
                      disabled={!available}
                      onCheckedChange={(value) =>
                        setForm({ ...form, [module.key]: Boolean(value) })
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer la configuration
        </Button>
      </div>
    </div>
  );
}
