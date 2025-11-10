
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ce layout est un simple passe-plat.
  // Next.js imbrique automatiquement ce contenu dans le `dashboard/layout.tsx` parent.
  // Il n'est pas nécessaire de ré-envelopper les enfants dans DashboardLayout ici.
  return <>{children}</>;
}
