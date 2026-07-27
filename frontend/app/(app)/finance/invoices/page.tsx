import { getBackendClient } from "@/lib/api/client";
import InvoicesClient from "./InvoicesClient";

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
  const invoices = await fetchInvoices();
  return (
    <div className="p-7 px-8">
      <h1 className="text-2xl font-bold text-white mb-6">Factures</h1>
      <InvoicesClient initialInvoices={JSON.parse(JSON.stringify(invoices))} />
    </div>
  );
}
