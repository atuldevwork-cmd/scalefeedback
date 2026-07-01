import { CardSkeleton } from '@/components/ui/spinner';

export default function ProjectsLoading() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2 animate-pulse">
          <div className="h-6 bg-gray-100 rounded-lg w-24" />
          <div className="h-4 bg-gray-100 rounded-lg w-64" />
        </div>
        <div className="h-9 w-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
