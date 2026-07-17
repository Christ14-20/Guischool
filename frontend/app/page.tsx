/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { redirect } from "next/navigation";

// La route racine "/" redirige systématiquement vers le bon dashboard
// en fonction du rôle de l'utilisateur connecté.
export default async function RootPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "SUPER_ADMIN") {
      redirect("/superadmin/dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
