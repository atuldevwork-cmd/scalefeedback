import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_FEEDBACK, MOCK_PROJECTS } from '@/lib/mock-data';
import { marketingUrl } from '@/lib/marketing-url';
import { planAtLeast } from '@/lib/plan';
import { AnalyticsClient } from './analytics-client';
import type { Feedback } from '@pinmarks/shared';

interface Props { params: Promise<{ id: string }> }

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;
  let feedback: Feedback[] = [];
  let projectName = '';
  let blockedByPlan = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const service = createServiceClient();
      const { data: proj } = await supabase.from('projects').select('name, organisation_id').eq('id', id).single();
      projectName = proj?.name ?? '';

      if (proj?.organisation_id) {
        const { data: org } = await service.from('organisations').select('plan').eq('id', proj.organisation_id).single();
        blockedByPlan = !planAtLeast(org?.plan, 'agency');
      }

      if (!blockedByPlan) {
        const { data } = await supabase.from('feedback').select('*').eq('project_id', id).order('created_at', { ascending: true });
        feedback = (data ?? []) as Feedback[];
      }
    } catch { /* fall through */ }
  }

  // redirect() throws internally — must run outside the try/catch above,
  // or Next's own control-flow exception gets swallowed by `catch`.
  if (blockedByPlan) {
    redirect(marketingUrl('/pricing'));
  }

  if (!feedback.length) {
    const mp = MOCK_PROJECTS.find((p) => p.id === id);
    projectName = mp?.name ?? 'Project';
    feedback = MOCK_FEEDBACK.filter((f) => f.project_id === id) as Feedback[];
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-foreground">{projectName}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Analytics</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-8">Analytics</h1>
      <AnalyticsClient feedback={feedback} />
    </div>
  );
}
