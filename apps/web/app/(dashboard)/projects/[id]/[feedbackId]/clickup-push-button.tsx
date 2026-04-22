'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export function ClickUpPushButton({ feedbackId }: { feedbackId: string }) {
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [taskUrl, setTaskUrl] = useState('');
  const toast = useToast();
  const router = useRouter();

  async function push() {
    setPushing(true);
    try {
      const res = await fetch('/api/clickup/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId }),
      });
      const data = await res.json() as { taskUrl?: string; error?: string };
      if (!res.ok) {
        toast(data.error ?? 'Failed to push to ClickUp', 'error');
      } else {
        setTaskUrl(data.taskUrl ?? '');
        setPushed(true);
        toast('Pushed to ClickUp successfully');
        router.refresh();
      }
    } catch {
      toast('Network error — could not push to ClickUp', 'error');
    } finally {
      setPushing(false);
    }
  }

  if (pushed) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClickUpIcon />
          <span className="text-sm font-semibold text-foreground">ClickUp</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-3">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Task created
        </div>
        {taskUrl && (
          <a
            href={taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#7B68EE] hover:text-[#6A58DD] font-semibold"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            View in ClickUp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ClickUpIcon />
        <span className="text-sm font-semibold text-foreground">ClickUp</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        This AI-detected issue hasn&apos;t been pushed yet. Review it and push to ClickUp when ready.
      </p>
      <button
        onClick={push}
        disabled={pushing}
        className="w-full flex items-center justify-center gap-2 bg-[#7B68EE] hover:bg-[#6A58DD] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
      >
        {pushing ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ClickUpIcon size={16} white />
        )}
        {pushing ? 'Pushing…' : 'Push to ClickUp'}
      </button>
    </div>
  );
}

function ClickUpIcon({ size = 18, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 14.4L5.9 12c1.5 1.8 3.1 2.7 4.8 2.7 1.7 0 3.3-.9 4.7-2.7l2.9 2.4C16.4 17 13.7 18.6 10.7 18.6c-3 0-5.7-1.6-7.7-4.2z"
        fill={white ? 'white' : '#8930FD'}
      />
      <path
        d="M10.7 5.4L5 10.3 3 8.1 10.7 1l7.7 7.1-2 2.2-5.7-4.9z"
        fill={white ? 'white' : '#FF02F0'}
      />
    </svg>
  );
}
