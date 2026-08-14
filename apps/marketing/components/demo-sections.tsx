const FEATURES = [
  {
    icon: 'ads_click',
    title: 'Pin anywhere',
    desc: 'Click any element on the page to drop a pin and describe exactly what\'s wrong.',
  },
  {
    icon: 'draw',
    title: 'Annotate visually',
    desc: 'Draw arrows, boxes, and text right on the screenshot so nothing gets lost in translation.',
  },
  {
    icon: 'terminal',
    title: 'Auto-captured context',
    desc: 'Browser, OS, URL, console logs, and network errors are attached automatically.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$9',
    desc: 'For small teams getting started with visual feedback.',
    features: ['1 project', 'Unlimited reporters', 'Screenshot annotation', 'Email support'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    desc: 'For growing teams who need integrations and history.',
    features: ['5 projects', 'Session replay', 'ClickUp, Jira, Slack sync', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Agency',
    price: '$59',
    desc: 'For agencies managing feedback across many clients.',
    features: ['Unlimited projects', 'White-label widget', 'All integrations', 'Dedicated support'],
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: 'We cut our bug-report back-and-forth in half. Screenshots and console logs arrive attached — no more "can you send a screenshot?" emails.',
    name: 'Priya Nair',
    role: 'QA Lead, Flowbase',
  },
  {
    quote: 'Clients can leave feedback directly on the staging site without an account. Setup took five minutes and just works.',
    name: 'Marcus Webb',
    role: 'Agency Owner, Webb Digital',
  },
  {
    quote: 'The auto-captured browser and OS info alone has saved us hours of back-and-forth reproducing bugs.',
    name: 'Sara Chen',
    role: 'Engineering Manager, Doko',
  },
];

export function DemoExtraSections() {
  return (
    <>
      {/* ── FEATURE CARDS ─────────────────────────────────────────── */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Try it out</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#111111] leading-tight">
              Click anything on this page to test it
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-[#ff724f]/10 rounded-xl flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[#ff724f] text-[24px]">{f.icon}</span>
                </div>
                <h3 className="font-bold text-[#111111] text-lg mb-2">{f.title}</h3>
                <p className="text-[#555555] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAMPLE SCREENSHOT MOCKUP ──────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Sample UI</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#111111] leading-tight">
              A dashboard to pin bugs on
            </h2>
          </div>
          <div className="rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Fake browser chrome */}
            <div className="bg-[#F1F1F1] px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            {/* Fake dashboard content */}
            <div className="bg-white p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-[#ff724f] rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
                    <div className="h-6 w-12 bg-gray-300 rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#111111] leading-tight">
              Teams that ship fewer missed bugs
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col">
                <p className="text-[#555555] text-sm leading-relaxed mb-5 flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-[#111111] text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[#ff724f] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#111111] leading-tight">
              Plans for testing purposes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 border ${
                  plan.highlight
                    ? 'border-[#ff724f] shadow-xl bg-white relative'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff724f] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <h3 className="font-bold text-[#111111] text-lg mb-1">{plan.name}</h3>
                <p className="text-[#555555] text-sm mb-4">{plan.desc}</p>
                <p className="text-3xl font-black text-[#111111] mb-5">
                  {plan.price}<span className="text-sm font-medium text-gray-400">/mo</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#555555]">
                      <span className="material-symbols-outlined text-[#ff724f] text-[16px]">check</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-[#ff724f] hover:bg-[#e8603a] text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-[#111111]'
                  }`}
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
