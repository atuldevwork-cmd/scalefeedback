'use client';

export function Spinner({ size = 20, color = '#ff724f' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ color }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Spinner size={36} />
      <p className="text-sm text-gray-400 font-medium">{text}</p>
    </div>
  );
}

export function SkeletonLine({ w = 'full', h = 4 }: { w?: string; h?: number }) {
  return (
    <div
      className={`bg-gray-100 rounded-lg animate-pulse w-${w}`}
      style={{ height: `${h * 4}px` }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-gray-100 rounded-xl" />
        <div className="w-14 h-5 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
      </div>
      <div className="h-px bg-gray-100" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-gray-100 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
        </div>
      </td>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-5 bg-gray-100 rounded-full w-16 ml-auto" />
        </td>
      ))}
    </tr>
  );
}
