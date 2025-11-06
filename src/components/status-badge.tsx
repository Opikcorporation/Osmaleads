'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';
import { CheckCircle2, XCircle, PhoneMissed, Hand, FileText, Sparkles, CircleDot } from 'lucide-react';

const statusConfig: Record<
  LeadStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  New: { label: 'Nouveau', icon: Sparkles, className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  Qualified: { label: 'Qualifié', icon: CheckCircle2, className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  'Not Qualified': { label: 'Non Qualifié', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  'No Answer': { label: 'Sans Réponse', icon: PhoneMissed, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  'Not Interested': { label: 'Pas Intéressé', icon: Hand, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  Signed: { label: 'Signé', icon: FileText, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
};


export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] || { label: 'Inconnu', icon: CircleDot, className: 'bg-gray-100 text-gray-800' };
  const { label, icon: Icon, className } = config;

  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 border-transparent font-medium px-2.5 py-1 rounded-md text-xs",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Badge>
  );
}
