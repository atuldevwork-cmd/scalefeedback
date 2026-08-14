import { MarketingNavbar } from '@/components/marketing-navbar';
import { MarketingFooter } from '@/components/marketing-footer';
import { DemoExtraSections } from '@/components/demo-sections';

const MARKER_SNIPPET = `
  window.markerConfig = {
    project: '69ca3cbaa10993f88c36f4ec',
    source: 'snippet'
  };

  !function(e,r,a){if(!e.__Marker){e.__Marker={};var t=[],n={__cs:t};["show","hide","isVisible","capture","cancelCapture","unload","reload","isExtensionInstalled","setReporter","clearReporter","setCustomData","on","off"].forEach(function(e){n[e]=function(){var r=Array.prototype.slice.call(arguments);r.unshift(e),t.push(r)}}),e.Marker=n;var s=r.createElement("script");s.async=1,s.src="https://edge.marker.io/latest/shim.js";var i=r.getElementsByTagName("script")[0];i.parentNode.insertBefore(s,i)}}(window,document);
`;

export default function DemoMarkerPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <MarketingNavbar />

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#ff724f]/10 border border-[#ff724f]/20 text-[#ff724f] rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-[#ff724f] rounded-full" />
            Widget demo (marker.io)
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#111111] mb-5 leading-tight tracking-tight">
            Marker.io widget demo
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            This clone of the demo page loads marker.io&apos;s real widget instead of ours, so the
            two can be compared side by side in separate tabs.
          </p>
        </div>
      </section>

      <DemoExtraSections />

      <MarketingFooter />

      <script dangerouslySetInnerHTML={{ __html: MARKER_SNIPPET }} />
    </div>
  );
}
