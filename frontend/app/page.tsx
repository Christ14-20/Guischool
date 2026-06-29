import { redirect } from "next/navigation";

// La route `/` redirige vers la landing locale par défaut (fr)
export default function RootPage() {
  redirect("/fr");
}
