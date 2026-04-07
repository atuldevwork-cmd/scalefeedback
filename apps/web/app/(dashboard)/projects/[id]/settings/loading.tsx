export default function SettingsLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-64 mb-6" />
      <div className="h-7 bg-gray-100 rounded-lg w-48 mb-8" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
            <div className="h-5 bg-gray-100 rounded w-40" />
            <div className="h-4 bg-gray-100 rounded w-72" />
            <div className="h-10 bg-gray-100 rounded-xl w-full max-w-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
