import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="bg-[#300a46] text-purple-300 py-12">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-xs">SF</div>
            <span className="font-bold text-white text-sm">ScaleFeedback</span>
          </div>
          <p className="text-xs leading-relaxed">For a web free of bugs. Built by ScaleStation.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Product</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link href="/#integrations" className="hover:text-white transition-colors">Integrations</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-3">Account</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
            <li><Link href="/signup" className="hover:text-[#ff724f] transition-colors">Start free trial</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 pt-6 border-t border-purple-800 text-xs">
        <p>© {new Date().getFullYear()} ScaleFeedback. All rights reserved.</p>
      </div>
    </footer>
  );
}
