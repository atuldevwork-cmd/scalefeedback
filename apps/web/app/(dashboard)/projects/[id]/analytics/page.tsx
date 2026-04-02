import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, MOCK_FEEDBACK, MOCK_PROJECTS } from '@/lib/mock-data';
import { AnalyticsClient } from './analytics-client';
import type { Feedback } from '@scalefeedback/shared';

interface Props { params: Promise<{ id: string }> }

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;
  let feedback: Feedback[] = [];
  let projectName = '';

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: proj } = await supabase.from('projects').select('name').eq('id', id).single();
      projectName = proj?.name ?? '';
      const { data } = await supabase.from('feedback').select('*').eq('project_id', id).order('created_at', { ascending: true });
      feedback = (data ?? []) as Feedback[];
    } catch { /* fall through */ }
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
