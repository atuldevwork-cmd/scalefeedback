import { TableRowSkeleton } from '@/components/ui/spinner';

export default function TeamLoading() {
  return (
    <div className="p-8 max-w-4xl animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-6 bg-gray-100 rounded-lg w-28" />
        <div className="h-4 bg-gray-100 rounded-lg w-36" />
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 h-24" />
      <div className="flex gap-3 mb-4">
        <div className="h-9 w-28 bg-gray-100 rounded-xl" />
        <div className="h-9 w-48 bg-gray-100 rounded-xl" />
        <div className="ml-auto h-9 w-32 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card">
        <table className="w-full">
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={3} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
