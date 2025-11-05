'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface ScoreBadgeProps {
    score: number | null | undefined;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null || typeof score === 'undefined') {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const getScoreColor = (value: number) => {
    if (value > 66) {
      return 'bg-green-500 text-white'; // Haut de gamme
    }
    if (value > 33) {
      return 'bg-yellow-500 text-black'; // Moyenne gamme
    }
    return 'bg-red-500 text-white'; // Bas de gamme
  };

  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 border-transparent font-medium px-2.5 py-1 rounded-full text-xs w-fit",
        getScoreColor(score)
      )}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      <span>{score}</span>
    </Badge>
  );
}
