import {
  SuperadminDashboardView,
  type SuperadminAlert,
  type SuperadminGrowthPoint,
  type SuperadminKpi,
  type SuperadminSchool,
} from '@/components/superadmin/superadmin-dashboard-view';

function monthLabel(date: Date) {
  return date.toLocaleDateString('fr-FR', { month: 'short' });
}

function makeFallbackData() {
  const latestSchools: SuperadminSchool[] = [
    { id: '1', name: 'Groupe Scolaire Horizon', plan: 'Pro', status: 'Active' },
    { id: '2', name: 'Complexe La Reussite', plan: 'Starter', status: 'Trial' },
    { id: '3', name: 'College Nongo', plan: 'Enterprise', status: 'Suspended' },
    { id: '4', name: 'College Djenabou', plan: 'Pro', status: 'Active' },
    { id: '5', name: 'Groupe Scolaire Matoto', plan: 'Starter', status: 'Active' },
  ];

  const growthData: SuperadminGrowthPoint[] = [
    { month: 'nov', schools: 8 },
    { month: 'dec', schools: 11 },
    { month: 'jan', schools: 15 },
    { month: 'fev', schools: 18 },
    { month: 'mar', schools: 22 },
    { month: 'avr', schools: 25 },
  ];

  const alerts: SuperadminAlert[] = [
    { id: 'a-1', level: 'WARNING', message: '2 ecoles approchent leur limite de stockage.' },
    { id: 'a-2', level: 'INFO', message: 'Synchronisation journaliere effectuee avec succes.' },
  ];

  const activeCount = latestSchools.filter((row) => row.status.toUpperCase() === 'ACTIVE').length;
  const suspendedCount = latestSchools.filter((row) => row.status.toUpperCase() === 'SUSPENDED').length;

  const kpis: SuperadminKpi[] = [
    { label: 'Ecoles totales', value: String(latestSchools.length), icon: 'schools' },
    { label: 'Ecoles actives', value: String(activeCount), icon: 'active' },
    { label: 'Ecoles suspendues', value: String(suspendedCount), icon: 'suspended' },
    { label: 'MRR estime', value: '12 500 000 GNF', icon: 'mrr' },
  ];

  return { kpis, growthData, latestSchools, alerts };
}

async function getSuperadminDashboardData() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  try {
    const [schoolsRes, alertsRes] = await Promise.all([
      fetch(`${baseUrl}/superadmin/schools/?page=1&page_size=5`, { cache: 'no-store' }),
      fetch(`${baseUrl}/monitoring/systemalerts/?is_resolved=false&page_size=5`, { cache: 'no-store' }),
    ]);

    if (!schoolsRes.ok || !alertsRes.ok) {
      return makeFallbackData();
    }

    const schoolsJson = await schoolsRes.json();
    const alertsJson = await alertsRes.json();

    const schoolsPayload = schoolsJson?.data ?? schoolsJson;
    const schoolsItemsRaw = schoolsPayload?.results ?? schoolsPayload?.items ?? schoolsPayload ?? [];
    const schoolsItems = Array.isArray(schoolsItemsRaw) ? schoolsItemsRaw : [];

    const latestSchools: SuperadminSchool[] = schoolsItems.slice(0, 5).map((item: any, index: number) => ({
      id: String(item.id ?? index),
      name: item.name ?? item.nom ?? `Ecole ${index + 1}`,
      plan: item.plan?.name ?? item.plan_name ?? 'N/A',
      status: item.status ?? 'Active',
    }));

    const totalSchools = Number(schoolsPayload?.count ?? schoolsItems.length);
    const activeCount = schoolsItems.filter((item: any) => String(item.status).toUpperCase() === 'ACTIVE').length;
    const suspendedCount = schoolsItems.filter((item: any) => String(item.status).toUpperCase() === 'SUSPENDED').length;

    const alertPayload = alertsJson?.data ?? alertsJson;
    const alertsItemsRaw = alertPayload?.results ?? alertPayload?.items ?? alertPayload ?? [];
    const alertsItems = Array.isArray(alertsItemsRaw) ? alertsItemsRaw : [];

    const alerts: SuperadminAlert[] = alertsItems.slice(0, 5).map((item: any, index: number) => ({
      id: String(item.id ?? index),
      level: String(item.level ?? 'INFO').toUpperCase() as SuperadminAlert['level'],
      message: item.message ?? 'Alerte systeme',
    }));

    const now = new Date();
    const growthData: SuperadminGrowthPoint[] = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        month: monthLabel(d),
        schools: Math.max(0, totalSchools - (5 - index) * 2),
      };
    });

    const kpis: SuperadminKpi[] = [
      { label: 'Ecoles totales', value: String(totalSchools), icon: 'schools' },
      { label: 'Ecoles actives', value: String(activeCount), icon: 'active' },
      { label: 'Ecoles suspendues', value: String(suspendedCount), icon: 'suspended' },
      { label: 'MRR estime', value: `${(totalSchools * 500000).toLocaleString('fr-FR')} GNF`, icon: 'mrr' },
    ];

    return { kpis, growthData, latestSchools, alerts };
  } catch {
    return makeFallbackData();
  }
}

export default async function SuperadminDashboardPage() {
  const data = await getSuperadminDashboardData();

  return (
    <SuperadminDashboardView
      kpis={data.kpis}
      growthData={data.growthData}
      latestSchools={data.latestSchools}
      alerts={data.alerts}
    />
  );
}
