import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { DemoExtraSections } from '@/components/demo-sections';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <MarketingNavbar />

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#ff724f]/10 border border-[#ff724f]/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full" />
            Widget demo
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] mb-5 leading-tight tracking-tight">
            Pinmarks widget demo
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            The feedback widget is embedded on this page. Look for its launcher button to pin an
            issue, annotate a screenshot, and submit feedback.
          </p>
        </div>
      </section>

      <DemoExtraSections />

      <MarketingFooter />

      <script src="http://localhost:3002/widget.js" data-project="proj_3f766d488b4147059bdf076edf299278"></script>
    </div>
  );
}
