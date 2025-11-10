'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { cn } from '@/lib/utils';
import type { Collaborator } from '@/lib/types';
import { LayoutDashboard, Settings, Users, BotMessageSquare, UserPlus, LineChart } from 'lucide-react';
import { useUser } from '@/firebase';
import Image from 'next/image';

interface AppSidebarProps {
  user: Collaborator;
}

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'collaborator'],
    },
    {
      href: '/dashboard/analyse',
      label: 'Analyse',
      icon: LineChart,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin/collaborators',
      label: 'Utilisateurs',
      icon: UserPlus,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin/groups',
      label: 'Groupes',
      icon: Users,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin/settings',
      label: 'Paramètres',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="Osmaleads Logo" width={120} height={30} />
        </Link>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems
          .filter((item) => user?.role && item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="mt-auto p-4 space-y-4">
        <div className="p-4 rounded-lg bg-sidebar-accent/50 border border-dashed border-primary/50">
          <div className='flex items-center gap-2'>
            <BotMessageSquare className="h-6 w-6 text-primary"/>
            <h3 className="font-semibold text-accent-foreground">Ernest IA</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Notre IA enrichit vos leads et suggère des stratégies optimales.
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-4 p-2 rounded-lg bg-sidebar-accent/50">
              <UserNav user={user} />
              <div className="flex flex-col">
                <span className="font-semibold">{user.name}</span>
                <span className="text-sm text-muted-foreground">{user.username}</span>
              </div>
          </div>
        )}
      </div>
    </aside>
  );
}
