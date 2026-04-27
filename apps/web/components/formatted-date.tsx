'use client';

import { formatDate } from '@/lib/utils';

interface Props {
  date: string | Date;
  className?: string;
}

export function FormattedDate({ date, className }: Props) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatDate(date)}
    </span>
  );
}
