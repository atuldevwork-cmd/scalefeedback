import { Sidebar } from '@/components/sidebar';
import { NavProgress } from '@/components/ui/nav-progress';

// Auth is handled by middleware (sf_local_session cookie)
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavProgress />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
