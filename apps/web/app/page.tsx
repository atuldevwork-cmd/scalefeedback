import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#300A46] to-[#2D1B69] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center font-bold text-sm">SF</div>
          <span className="font-semibold text-lg">ScaleFeedback</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Dashboard
          </Link>
          <Link href="/projects" className="bg-[#FF6B35] hover:bg-[#FF7A59] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-[#5CE8C8] rounded-full animate-pulse" />
          Visual Feedback for Development Teams
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Bug reporting that<br />
          <span className="text-[#FF6B35]">actually works</span>
        </h1>

        <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
          Embed a lightweight widget on any website. Your users click, annotate a screenshot,
          and submit — you get full context: browser, OS, console logs, and more.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link
            href="/projects"
            className="bg-[#FF6B35] hover:bg-[#FF7A59] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-base"
          >
            Go to Dashboard →
          </Link>
          <a
            href="#how-it-works"
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-base"
          >
            See how it works
          </a>
        </div>

        <p className="text-white/40 text-sm">Free to start · No credit card required</p>
      </section>

      {/* Dashboard preview */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/10">
            <div className="w-3 h-3 rounded-full bg-red-400/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
            <div className="w-3 h-3 rounded-full bg-green-400/60" />
            <span className="ml-3 text-white/30 text-xs font-mono">scalefeedback.app/projects</span>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {[
              { name: 'My Client Site', domain: 'client-site.com', count: 12, color: '#7C3AED' },
              { name: 'E-Commerce Store', domain: 'mystore.io', count: 4, color: '#FF6B35' },
            ].map((p) => (
              <div key={p.name} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                    {p.name[0]}
                  </div>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="font-semibold text-white text-sm">{p.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{p.domain}</p>
                <p className="text-white/60 text-xs mt-3">{p.count} feedback items</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-8 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything your team needs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '📸',
              title: 'Screenshot + Annotation',
              desc: 'One click captures the page. Users draw arrows, boxes, and text directly on the screenshot.',
            },
            {
              icon: '🔍',
              title: 'Auto Technical Context',
              desc: 'Browser, OS, screen size, console logs, and failed network requests — captured automatically.',
            },
            {
              icon: '⚡',
              title: 'Instant Dashboard',
              desc: 'Your team sees all feedback in one place. Filter by status, assign, and resolve issues fast.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to embed */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">One snippet. That&apos;s it.</h2>
          <p className="text-white/60 mb-6">Paste before your closing &lt;/body&gt; tag and you&apos;re live.</p>
          <div className="bg-gray-950 rounded-xl px-6 py-4 text-left font-mono text-sm text-gray-300 inline-block max-w-lg w-full">
            <span className="text-gray-500">&lt;script</span>{' '}
            <span className="text-yellow-400">src</span>
            <span className="text-gray-500">=</span>
            <span className="text-green-400">&quot;https://scalefeedback.app/widget.js&quot;</span><br />
            {'  '}<span className="text-yellow-400">data-project</span>
            <span className="text-gray-500">=</span>
            <span className="text-green-400">&quot;proj_your_key&quot;</span><br />
            <span className="text-gray-500">&gt;&lt;/script&gt;</span>
          </div>
          <div className="mt-8">
            <Link href="/projects" className="bg-[#FF6B35] hover:bg-[#FF7A59] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
              Open Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-8 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <div className="w-5 h-5 bg-violet-500 rounded flex items-center justify-center font-bold text-xs">SF</div>
          ScaleFeedback — Built by ScaleStation
        </div>
        <Link href="/projects" className="text-white/40 hover:text-white text-sm transition-colors">
          Dashboard
        </Link>
      </footer>
    </main>
  );
}
