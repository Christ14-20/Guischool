import { redirect } from "next/navigation";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/finance/payments`);
}
