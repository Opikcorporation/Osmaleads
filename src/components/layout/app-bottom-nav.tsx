'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Collaborator } from '@/lib/types';
import {
  LayoutDashboard,
  LineChart,
  Shield,
  User as UserIcon
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';


interface AppBottomNavProps {
  user: Collaborator;
}

export default function AppBottomNav({ user }: AppBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'collaborator'],
    },
    {
      href: '/dashboard/analyse',
      label: 'Analyse',
      icon: LineChart,
      roles: ['admin', 'collaborator'],
    },
    {
      href: '/dashboard/admin',
      label: 'Admin',
      icon: Shield,
      roles: ['admin'],
    },
  ];

  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems
          .filter((item) => user?.role && item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group',
                 pathname.startsWith(item.href) && item.href !== '/dashboard/admin' ? 'text-primary' : 'text-muted-foreground',
                 pathname.startsWith('/dashboard/admin') && item.href.startsWith('/dashboard/admin') ? 'text-primary' : ''
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
           <div className="inline-flex flex-col items-center justify-center px-5">
             <UserNav user={user} />
           </div>
      </div>
    </footer>
  );
}
