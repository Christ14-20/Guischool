import { getBackendClient } from "@/lib/api/client";
import PaymentsClient from "./PaymentsClient";

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
  const payments = await fetchPayments();
  return (
    <div className="p-7 px-8">
      <h1 className="text-2xl font-bold text-white mb-6">Paiements</h1>
      <PaymentsClient initialPayments={JSON.parse(JSON.stringify(payments))} />
    </div>
  );
}
