import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import PaymentsClient from "./PaymentsClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function fetchPayments() {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/payments/");
    const data = resp.data;
    return data?.data?.results ?? data?.data ?? data?.results ?? [];
  } catch {
    return [];
  }
}

export default async function PaymentsPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.FINANCE_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les paiements." />;
  }
  const canCreate = hasPermission(permissions, PERMISSIONS.FINANCE_CREATE);

  const payments = await fetchPayments();
  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0">Paiements</h1>
      </div>
      <div className="px-11 pb-12">
        <PaymentsClient initialPayments={JSON.parse(JSON.stringify(payments))} canCreate={canCreate} />
      </div>
    </div>
  );
}
