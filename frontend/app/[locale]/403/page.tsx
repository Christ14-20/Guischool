import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ForbiddenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <ShieldOff className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">403</h1>
        <p className="text-lg font-medium">Accès refusé</p>
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette
          page.
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={`/${locale}/app/dashboard`} />}
      >
        Retour au tableau de bord
      </Button>
    </div>
  );
}
