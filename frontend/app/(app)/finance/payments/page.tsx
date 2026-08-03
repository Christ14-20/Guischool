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
    <div className="min-h-screen bg-paper text-text">
      <div className="px-11 pt-9 pb-[22px]">
        <h1 className="font-serif text-[26px] font-medium m-0">Paiements</h1>
      </div>
      <div className="px-11 pb-12">
        <PaymentsClient initialPayments={JSON.parse(JSON.stringify(payments))} />
      </div>
    </div>
  );
}
