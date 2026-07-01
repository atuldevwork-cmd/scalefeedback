import type { FeedbackPriority } from '@scalefeedback/shared';

const config: Record<FeedbackPriority, { label: string; className: string }> = {
  low:      { label: 'Low',      className: 'bg-gray-100 text-gray-600' },
  medium:   { label: 'Medium',   className: 'bg-blue-50 text-blue-700' },
  high:     { label: 'High',     className: 'bg-orange-50 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700 font-semibold' },
};

export function PriorityBadge({ priority }: { priority: FeedbackPriority }) {
  const { label, className } = config[priority] ?? config.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${className}`}>
      {label}
    </span>
  );
}
