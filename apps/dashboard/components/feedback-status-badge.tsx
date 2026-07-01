import { cn } from '@/lib/utils';
import type { FeedbackStatus } from '@scalefeedback/shared';

const statusConfig: Record<FeedbackStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-50 text-yellow-700' },
  resolved: { label: 'Resolved', className: 'bg-green-50 text-green-700' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
  wont_fix: { label: "Won't Fix", className: 'bg-red-50 text-red-600' },
};

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  const config = statusConfig[status] ?? statusConfig.open;
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.className)}>
      {config.label}
    </span>
  );
}
