import { cn } from '@/lib/utils';
import type { FeedbackType } from '@pinmarks/shared';

const typeConfig: Record<FeedbackType, { label: string; className: string }> = {
  bug: { label: 'Bug', className: 'bg-red-50 text-red-700' },
  suggestion: { label: 'Suggestion', className: 'bg-purple-50 text-purple-700' },
  question: { label: 'Question', className: 'bg-sky-50 text-sky-700' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-600' },
};

export function FeedbackTypeBadge({ type }: { type: FeedbackType }) {
  const config = typeConfig[type] ?? typeConfig.other;
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', config.className)}>
      {config.label}
    </span>
  );
}
