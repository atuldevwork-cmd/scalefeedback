'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/mock-data';

export function RealtimeRefresh({ projectId }: { projectId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`feedback:${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback', filter: `project_id=eq.${projectId}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feedback', filter: `project_id=eq.${projectId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, router]);

  return null;
}
