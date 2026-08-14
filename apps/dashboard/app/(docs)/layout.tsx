import Link from 'next/link';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-6 h-14 flex items-center justify-between">
        <Link href="/docs" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-[#ff724f] rounded-lg flex items-center justify-center font-bold text-white text-xs">P</div>
          <span className="font-bold text-foreground">Pinmarks</span>
        </Link>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to dashboard
        </Link>
      </header>
      {children}
    </div>
  );
}
