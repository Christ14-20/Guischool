import { redirect } from "next/navigation";

// La route racine "/" redirige systématiquement vers /dashboard.
// Le middleware Auth.js (middleware.ts) se chargera de renvoyer
// vers /login si l'utilisateur n'est pas authentifié.
export default function RootPage() {
  redirect("/dashboard");
}
