'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight, UserPlus } from 'lucide-react';
import Link from 'next/link';

const adminSections = [
  {
    title: 'Gérer les Collaborateurs',
    description: 'Ajouter, modifier ou supprimer des comptes utilisateurs.',
    href: '/dashboard/admin/collaborators',
    icon: UserPlus,
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Tableau de Bord Administrateur</h1>
      </div>
      <p className="text-muted-foreground">
        Bienvenue dans votre centre de contrôle. Gérez les utilisateurs de l'application.
      </p>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link href={section.href} key={section.title} className="group">
            <Card className="flex h-full flex-col transition-all group-hover:border-primary group-hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <section.icon className="h-6 w-6 text-primary" />
                            {section.title}
                        </CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow"></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
