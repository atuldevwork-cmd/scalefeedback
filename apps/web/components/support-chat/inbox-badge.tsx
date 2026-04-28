'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SupportInboxBadge() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/support/chats?scope=waiting-count');
      const { count: n } = await res.json() as { count: number };
      setCount(n ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCount();
    const supabase = createClient();
    const channel = supabase
      .channel('support-waiting-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, fetchCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#ff724f] text-white text-[10px] font-bold flex items-center justify-center px-1">
      {count > 9 ? '9+' : count}
    </span>
  );
}
