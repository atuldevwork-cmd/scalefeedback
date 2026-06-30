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

const FEATURES = [
  {
    id: 'feedback',
    badge: 'Website feedback',
    headline: 'Annotate your site with visual feedback',
    desc: 'Easily make comments and add annotations to live pages or websites in production. Your whole team can log issues without ever leaving the browser.',
    quote: '"We can log issues directly on our site, without leaving the browser."',
    author: "Vincent, Director of Excellence at L'Oréal",
    Visual: FeedbackVisual,
    flip: false,
  },
  {
    id: 'bugs',
    badge: 'Bug reporting',
    headline: 'Reproduce website bugs faster',
    desc: 'Give your engineering team the context they need to squash bugs automatically. Every report includes browser, OS, screen, URL, console errors, and failed network requests.',
    quote: '"Our developers have everything they need to debug and fix issues."',
    author: 'Andrew, Product Manager at FantasyPros',
    Visual: BugReportVisual,
    flip: true,
  },
  {
    id: 'replay',
    badge: 'Session replay',
    headline: 'Replay user sessions',
    desc: 'See exactly what actions led to a bug and share the video with key stakeholders. No more asking users to record their screen.',
    quote: '"We get to see what happened, without our users needing to record a video."',
    author: 'Cody, Scrum Master at Samtec.com',
    Visual: SessionReplayVisual,
    flip: false,
  },
  {
    id: 'communication',
    badge: 'Communication',
    headline: 'Collaborate with stakeholders on revisions',
    desc: 'Keep everyone aligned with inline comments, file attachments, and status updates — all in one place. No more back-and-forth emails.',
    quote: '"We cut down emails by 70%."',
    author: 'Josh, Founder at Mobile App City',
    Visual: CommunicationVisual,
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
            Collect website feedback 10× faster
          </h2>
          <p className="text-[#555555] text-lg max-w-2xl mx-auto">
            Everything your team needs to collect visual feedback, report bugs, and ship fixes — faster.
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
                  <blockquote className="border-l-4 border-[#F5C800] pl-4">
                    <p className="text-[#555555] italic text-sm">{feature.quote}</p>
                    <footer className="text-xs text-gray-400 mt-1.5 font-semibold">— {feature.author}</footer>
                  </blockquote>
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
