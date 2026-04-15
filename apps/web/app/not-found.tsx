import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9f9fb] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(48,10,70,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-96 h-96 rounded-full opacity-5"
        style={{ background: '#ff724f', transform: 'translate(40%, -40%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5"
        style={{ background: '#300a46', transform: 'translate(-40%, 40%)' }}
      />

      {/* Logo */}
      <div className="mb-12 flex flex-col items-center gap-1 z-10">
        <a className="flex items-center gap-2 shrink-0" href="/projects">
          <div className="w-8 h-8 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-sm">SF</div>
          <span className="font-bold text-lg text-[#300a46]">ScaleFeedback</span>
        </a>
      </div>

      {/* Main card */}
      <div className="z-10 text-center">
        {/* Big 404 */}
        <div className="relative mb-6 select-none">
          <span
            className="text-[160px] font-bold leading-none tracking-tighter"
            style={{
              background: 'linear-gradient(135deg, #300a46 0%, #ff724f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </span>
        </div>

        {/* Icon + message */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#ff724f] text-[22px]">
            travel_explore
          </span>
          <h1 className="text-xl font-bold text-[#300a46]">Page not found</h1>
        </div>

        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
          Looks like this page took a wrong turn. It may have been moved, deleted, or never
          existed.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-2 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm shadow-sm"
           
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            Go to Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#300a46] bg-white border border-gray-200 shadow-sm hover:border-[#300a46]/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Go back
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-gray-400 z-10">
        ScaleFeedback by ScaleStation
      </p>
    </div>
  );
}
