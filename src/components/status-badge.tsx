import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';
import { CheckCircle2, XCircle, PhoneMissed, Hand, FileText, Sparkles, CircleDot } from 'lucide-react';

const statusConfig: Record<
  LeadStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  New: { label: 'New', icon: Sparkles, color: 'bg-blue-500' },
  Qualified: { label: 'Qualified', icon: CheckCircle2, color: 'bg-green-500' },
  'Not Qualified': { label: 'Not Qualified', icon: XCircle, color: 'bg-red-500' },
  'No Answer': { label: 'No Answer', icon: PhoneMissed, color: 'bg-yellow-500' },
  'Not Interested': { label: 'Not Interested', icon: Hand, color: 'bg-orange-500' },
  Signed: { label: 'Signed', icon: FileText, color: 'bg-purple-500' },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] || { label: 'Unknown', icon: CircleDot, color: 'bg-gray-400' };
  const { label, icon: Icon, color } = config;

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-2 border-none text-white font-medium px-3 py-1 rounded-full"
      style={{ backgroundColor: `hsl(var(--${statusToColor(status)}))` }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Badge>
  );
}

function statusToColor(status: LeadStatus): string {
    switch (status) {
        case 'New': return 'primary';
        case 'Qualified': return 'chart-2';
        case 'Not Qualified': return 'destructive';
        case 'No Answer': return 'chart-4';
        case 'Not Interested': return 'chart-5';
        case 'Signed': return 'accent';
        default: return 'muted';
    }
}
