'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';
import { CheckCircle2, XCircle, PhoneMissed, Hand, FileText, Sparkles, CircleDot, Loader } from 'lucide-react';

const statusConfig: Record<
  LeadStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  New: { label: 'New', icon: Sparkles, className: 'bg-sky-500 text-white' },
  Analyzing: { label: 'Analyse IA', icon: Loader, className: 'bg-slate-400 text-white animate-spin' },
  Qualified: { label: 'Qualified', icon: CheckCircle2, className: 'bg-green-500 text-white' },
  'Not Qualified': { label: 'Not Qualified', icon: XCircle, className: 'bg-red-500 text-white' },
  'No Answer': { label: 'No Answer', icon: PhoneMissed, className: 'bg-yellow-500 text-black' },
  'Not Interested': { label: 'Not Interested', icon: Hand, className: 'bg-orange-500 text-white' },
  Signed: { label: 'Signed', icon: FileText, className: 'bg-purple-600 text-white' },
};


export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] || { label: 'Unknown', icon: CircleDot, className: 'bg-gray-500 text-white' };
  const { label, icon: Icon, className } = config;

  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 border-transparent font-medium px-2.5 py-1 rounded-full text-xs",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", { 'animate-spin': status === 'Analyzing' })} />
      <span>{label}</span>
    </Badge>
  );
}
