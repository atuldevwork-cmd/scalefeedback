function FeedbackVisual() {
  return (
    <div className="bg-[#FFF8CC] rounded-2xl p-6 h-72 flex items-center justify-center border border-yellow-200">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
        <div className="bg-gray-100 rounded-t-xl px-3 py-2 flex items-center gap-1.5 border-b border-gray-200">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex-1 mx-2 bg-white rounded px-2 py-0.5 text-[10px] text-gray-400 font-mono">mysite.com/checkout</div>
        </div>
        <div className="p-4">
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
          <div className="relative mb-4">
            <div className="h-9 bg-[#FFF8CC] border-2 border-[#F5C800] border-dashed rounded-lg flex items-center px-3">
              <span className="text-[10px] text-[#D4A800] font-medium">This button is not responding!</span>
            </div>
            <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-[#F5C800] rounded-full flex items-center justify-center text-[#111111] text-[9px] font-bold shadow-md border-2 border-white">1</div>
          </div>
          <div className="flex justify-end">
            <div className="bg-[#F5C800] text-[#111111] text-[10px] px-3 py-1.5 rounded-lg font-bold">Submit feedback</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BugReportVisual() {
  return (
    <div className="bg-[#F9F9F9] rounded-2xl p-6 h-72 flex flex-col gap-2 border border-gray-100">
      <p className="text-xs font-semibold text-[#111111] mb-1">Auto-captured bug context</p>
      {[
        { label: 'Browser', value: 'Chrome 124', color: 'bg-[#FFF8CC] text-[#D4A800]' },
        { label: 'OS', value: 'macOS Sonoma', color: 'bg-gray-100 text-[#111111]' },
        { label: 'Screen', value: '1440 × 900', color: 'bg-blue-50 text-blue-700' },
        { label: 'URL', value: '/checkout/step-2', color: 'bg-gray-100 text-[#555555]' },
        { label: 'Console errors', value: '2 errors', color: 'bg-red-50 text-red-700' },
        { label: 'Network', value: '1 failed request', color: 'bg-red-50 text-red-700' },
      ].map(item => (
        <div key={item.label} className="bg-white rounded-lg px-3 py-1.5 flex items-center justify-between border border-gray-100 shadow-sm">
          <span className="text-xs text-[#555555] font-medium">{item.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function SessionReplayVisual() {
  return (
    <div className="bg-[#F9F9F9] rounded-2xl p-6 h-72 flex flex-col gap-3 border border-gray-100">
      <div className="bg-[#111111] rounded-xl flex-1 relative overflow-hidden flex flex-col items-center justify-center gap-3 p-4">
        <div className="flex gap-1 items-end w-full justify-center">
          {[2, 4, 3, 6, 5, 8, 4, 10, 7, 5, 9, 6, 3, 8].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${h * 4}px`,
                backgroundColor: i === 7 ? '#F5C800' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 w-full">
          <div className="w-5 h-5 rounded-full bg-[#F5C800] flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-[#111111]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 h-1 bg-white/10 rounded-full relative">
            <div className="absolute left-0 top-0 h-full w-[55%] bg-[#F5C800] rounded-full" />
            <div className="absolute top-1/2 left-[55%] -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border-2 border-[#F5C800]" />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">0:32 / 1:04</span>
        </div>
      </div>
      <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
        <p className="text-[10px] text-[#555555] font-medium">User clicked &ldquo;Checkout&rdquo; → 404 error appeared</p>
      </div>
    </div>
  );
}

function CommunicationVisual() {
  return (
    <div className="bg-[#F9F9F9] rounded-2xl p-5 h-72 border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#111111]">Issue #42 — Login button broken</p>
        <span className="text-[10px] bg-[#FFF8CC] text-[#D4A800] border border-yellow-200 px-2 py-0.5 rounded-full font-medium">In Review</span>
      </div>
      <div className="space-y-3">
        {[
          { user: 'SJ', name: 'Sarah J.', msg: 'Button not clickable on iPhone 14. Screenshot attached.', time: '2h ago', bg: 'bg-[#F5C800]', tc: 'text-[#111111]' },
          { user: 'AT', name: 'Alex T.', msg: 'Reproduced. CSS z-index conflict on mobile. Working on a fix.', time: '1h ago', bg: 'bg-[#111111]', tc: 'text-white' },
          { user: 'PK', name: 'Priya K.', msg: 'Status updated to In Review. Thanks everyone!', time: '30m ago', bg: 'bg-gray-300', tc: 'text-[#111111]' },
        ].map(c => (
          <div key={c.user} className="flex gap-2">
            <div className={`w-7 h-7 rounded-full ${c.bg} ${c.tc} flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5`}>{c.user}</div>
            <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-semibold text-[#111111]">{c.name}</span>
                <span className="text-[9px] text-gray-400">{c.time}</span>
              </div>
              <p className="text-[10px] text-[#555555]">{c.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoWayIntegrationsVisual() {
  const tools = [
    { name: 'ClickUp', color: '#7B68EE', letter: 'CU' },
    { name: 'Jira', color: '#2684FF', letter: 'J' },
    { name: 'GitHub', color: '#24292E', letter: 'GH' },
    { name: 'Slack', color: '#E01E5A', letter: 'S' },
  ];
  return (
    <div className="bg-[#F9F9F9] rounded-2xl p-6 h-72 flex flex-col justify-center gap-4 border border-gray-100">
      <div className="flex items-center justify-between gap-4">
        {/* Pinmarks side */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] flex items-center justify-center shadow-md">
            <span className="text-[#ff724f] font-black text-xs">PM</span>
          </div>
          <span className="text-[9px] font-semibold text-[#111111]">Pinmarks</span>
        </div>

        {/* Arrows + sync rows */}
        <div className="flex-1 flex flex-col gap-2">
          {tools.map((tool, i) => (
            <div key={tool.name} className="flex items-center gap-2">
              {/* Left arrow (tool → Pinmarks) */}
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-px bg-gray-300" />
                <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 8 8">
                  <path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Tool icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[8px] shrink-0 shadow-sm"
                style={{ backgroundColor: tool.color }}
              >
                {tool.letter}
              </div>
              {/* Right arrow (Pinmarks → tool) */}
              <div className="flex-1 flex items-center gap-1">
                <svg className="w-3 h-3 text-[#ff724f] shrink-0" fill="none" viewBox="0 0 8 8">
                  <path d="M7 4H1M4 7L1 4l3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="flex-1 h-px bg-[#ff724f]/40" />
              </div>
            </div>
          ))}
        </div>

        {/* Status update badge */}
        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-bold text-emerald-700">Status synced</p>
            <p className="text-[7px] text-emerald-600">Resolved ✓</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-center">
            <p className="text-[8px] font-bold text-blue-700">Issue created</p>
            <p className="text-[7px] text-blue-600">Jira #4821</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
        <p className="text-[9px] text-[#555555]">
          <span className="font-semibold text-[#111111]">Status update:</span> Jira issue #4821 marked &ldquo;Done&rdquo; → Pinmarks feedback auto-resolved
        </p>
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden h-72">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs font-bold text-[#111111]">Analytics</p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Total feedback', value: '247', color: 'text-[#111111]' },
          { label: 'Open', value: '38', color: 'text-blue-500' },
          { label: 'Resolved', value: '189', color: 'text-emerald-500' },
          { label: 'Avg resolution', value: '2.4d', color: 'text-[#ff724f]' },
        ].map(s => (
          <div key={s.label} className="p-3">
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[8px] text-[#555555] font-medium mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[9px] font-semibold text-[#111111] mb-2">Feedback over time (last 30 days)</p>
        <div className="flex items-end gap-px h-10">
          {[2,4,3,6,5,8,4,7,9,5,11,8,14,6,9,7,12,8,15,10,7,13,9,11,8,14,12,16,13,18].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm"
              style={{ height: `${(h / 18) * 100}%`, backgroundColor: i >= 27 ? '#ff724f' : '#E5E7EB' }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="p-3">
          <p className="text-[9px] font-bold text-[#111111] mb-2">By type</p>
          {[{ label: 'Bug', pct: 65 }, { label: 'Suggestion', pct: 20 }, { label: 'Question', pct: 10 }, { label: 'Other', pct: 5 }].map(t => (
            <div key={t.label} className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] text-gray-500 w-12 shrink-0">{t.label}</span>
              <div className="flex-1 h-1 bg-gray-100 rounded-full">
                <div className="h-full bg-[#ff724f] rounded-full" style={{ width: `${t.pct}%` }} />
              </div>
              <span className="text-[8px] text-gray-400 w-6 text-right">{t.pct}%</span>
            </div>
          ))}
        </div>
        <div className="p-3">
          <p className="text-[9px] font-bold text-[#111111] mb-2">By status</p>
          {[{ label: 'Open', pct: 15 }, { label: 'In Progress', pct: 10 }, { label: 'Resolved', pct: 65 }, { label: 'Closed', pct: 8 }, { label: "Won't Fix", pct: 2 }].map(t => (
            <div key={t.label} className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] text-gray-500 w-12 shrink-0">{t.label}</span>
              <div className="flex-1 h-1 bg-gray-100 rounded-full">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${t.pct}%` }} />
              </div>
              <span className="text-[8px] text-gray-400 w-6 text-right">{t.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: 'feedback',
    badge: 'Website feedback',
    headline: 'Pin feedback anywhere on your live site',
    desc: 'Click on any element on a live page to leave a comment or annotation. Your whole team sees it instantly — no screenshots buried in emails, no context lost in translation.',
    quote: '',
    author: '',
    Visual: FeedbackVisual,
    flip: false,
  },
  {
    id: 'bugs',
    badge: 'Bug reporting',
    headline: 'Every bug report ships with full developer context',
    desc: 'Browser, OS, screen size, URL, console errors, and failed network requests — all auto-captured the moment feedback is submitted. Devs can reproduce it without a single follow-up question.',
    quote: '',
    author: '',
    Visual: BugReportVisual,
    flip: true,
  },
  {
    id: 'replay',
    badge: 'Session replay',
    headline: 'Watch exactly what happened, not just a screenshot',
    desc: 'Session replay shows every click, scroll, and action leading up to a bug. Share the recording with your team — no more asking users to screen-record and send a video.',
    quote: '',
    author: '',
    Visual: SessionReplayVisual,
    flip: false,
  },
  {
    id: 'communication',
    badge: 'Communication',
    headline: 'All the discussion. None of the email chains.',
    desc: 'Inline comments, file attachments, and status updates — all threaded to the exact issue on the exact page. Keep clients and developers in sync without leaving Pinmarks.',
    quote: '',
    author: '',
    Visual: CommunicationVisual,
    flip: true,
  },
  {
    id: 'integrations',
    badge: 'Two-way integrations',
    headline: 'Changes in your tools reflect back in Pinmarks',
    desc: 'Push feedback to Jira, ClickUp, GitHub, or Slack in one click — and when the issue is resolved in your tool, Pinmarks updates automatically. No manual status syncing, ever.',
    quote: '',
    author: '',
    Visual: TwoWayIntegrationsVisual,
    flip: false,
  },
  {
    id: 'analytics',
    badge: 'Analytics',
    headline: 'Full visibility into your feedback pipeline',
    desc: 'Track total feedback, open issues, resolution rate, and average fix time — broken down by type and status. Know exactly where bugs come from and how fast your team fixes them.',
    quote: '',
    author: '',
    Visual: AnalyticsVisual,
    flip: true,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-[#F9F9F9]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-sm font-semibold text-[#D4A800] uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-4xl md:text-5xl font-black text-[#111111] mb-4 leading-tight">
            From feedback to fix,<br />without the friction
          </h2>
          <p className="text-[#555555] text-lg max-w-2xl mx-auto">
            Everything your team needs to pin issues, capture full context, and ship fixes — all in one place.
          </p>
        </div>

        <div className="space-y-8">
          {FEATURES.map((feature) => {
            const { Visual } = feature;
            return (
              <div
                key={feature.id}
                className={`bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col ${
                  feature.flip ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                {/* Text side */}
                <div className="flex-1 p-10 flex flex-col justify-center">
                  <span className="inline-block text-xs font-bold text-[#D4A800] uppercase tracking-widest bg-[#FFF8CC] px-3 py-1 rounded-full border border-yellow-200 w-fit mb-5">
                    {feature.badge}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-[#111111] mb-4 leading-snug">
                    {feature.headline}
                  </h3>
                  <p className="text-[#555555] leading-relaxed mb-7">{feature.desc}</p>
                  {feature.quote && (
                    <blockquote className="border-l-4 border-[#F5C800] pl-4">
                      <p className="text-[#555555] italic text-sm">{feature.quote}</p>
                      <footer className="text-xs text-gray-400 mt-1.5 font-semibold">— {feature.author}</footer>
                    </blockquote>
                  )}
                </div>

                {/* Visual side */}
                <div className="flex-1 bg-[#F9F9F9] p-8 flex items-center justify-center border-t md:border-t-0 border-gray-100 md:border-l md:border-r-0">
                  <div className="w-full max-w-md">
                    <Visual />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
