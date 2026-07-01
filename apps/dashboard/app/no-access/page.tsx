import Link from 'next/link';

export default function NoAccessPage() {
  return (
    <div className="min-h-screen bg-[#f9f9fb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <span className="material-symbols-outlined text-red-500 text-[28px]">lock</span>
        </div>
        <h1 className="text-lg font-bold text-[#111111] mb-2">No access</h1>
        <p className="text-gray-500 text-sm mb-6">
          You don&apos;t belong to any workspace and don&apos;t have guest access to any project.
          Ask the project owner to share an invite link with you.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[#ff724f] font-semibold text-sm hover:text-[#ff724f]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to login
        </Link>
      </div>
    </div>
  );
}
