import { redirect } from 'next/navigation';

// Page racine `/fr` ou `/en` → redirige vers la page de login
export default async function LocaleRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
