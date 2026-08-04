import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import InvoicesClient from "./InvoicesClient";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function fetchInvoices() {
  try {
    const client = await getBackendClient();
    const resp = await client.get("/finance/invoices/");
    const data = resp.data;
    return data?.data?.results ?? data?.data ?? data?.results ?? [];
  } catch {
    return [];
  }
}

export default async function InvoicesPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.FINANCE_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les factures." />;
  }
  const canGeneratePdf = hasPermission(permissions, PERMISSIONS.FINANCE_UPDATE);

  const invoices = await fetchInvoices();
  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0">Factures</h1>
      </div>
      <div className="px-11 pb-12">
        <InvoicesClient initialInvoices={JSON.parse(JSON.stringify(invoices))} canGeneratePdf={canGeneratePdf} />
      </div>
    </div>
  );
}
