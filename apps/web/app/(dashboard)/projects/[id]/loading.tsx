import { TableRowSkeleton } from '@/components/ui/spinner';

export default function ProjectLoading() {
  return (
    <div className="p-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 rounded-lg w-40" />
          <div className="h-4 bg-gray-100 rounded-lg w-24" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-100 rounded-xl" />
          <div className="h-9 w-28 bg-gray-100 rounded-xl" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3 mb-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card">
        <table className="w-full">
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={4} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
