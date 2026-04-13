import { redirect } from 'next/navigation';

// La route `/` redirige vers la locale par défaut (fr)
export default function RootPage() {
  redirect('/fr/login');
}
