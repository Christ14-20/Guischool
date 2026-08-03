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
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0">Factures</h1>
      </div>
      <div className="px-11 pb-12">
        <InvoicesClient initialInvoices={JSON.parse(JSON.stringify(invoices))} />
      </div>
    </div>
  );
}
