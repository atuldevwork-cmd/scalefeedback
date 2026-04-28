'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SupportChat {
  id: string;
  user_name: string | null;
  user_email: string | null;
  status: 'bot' | 'waiting_human' | 'with_human' | 'resolved';
  agent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'bot' | 'agent';
  content: string;
  created_at: string;
}

const STATUS_LABELS: Record<SupportChat['status'], string> = {
  bot: 'Bot handling',
  waiting_human: 'Needs team',
  with_human: 'Active',
  resolved: 'Resolved',
};

const STATUS_COLORS: Record<SupportChat['status'], string> = {
  bot: 'bg-gray-100 text-gray-600',
  waiting_human: 'bg-amber-100 text-amber-700',
  with_human: 'bg-green-100 text-green-700',
  resolved: 'bg-blue-100 text-blue-700',
};

const STATUS_ORDER: SupportChat['status'][] = ['waiting_human', 'with_human', 'bot', 'resolved'];

export default function SupportInboxPage() {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportChat['status'] | 'all'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = useCallback(async () => {
    const res = await fetch('/api/support/chats?scope=inbox');
    if (res.status === 403) { window.location.href = '/projects'; return; }
    const { data } = await res.json() as { data: SupportChat[] };
    setChats(
      (data ?? []).sort((a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      )
    );
  }, []);

  useEffect(() => {
    fetchChats().finally(() => setLoading(false));
  }, [fetchChats]);

  // Realtime: listen for new chats and updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('support-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_chats' },
        () => fetchChats()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchChats]);

  // Realtime: messages in active chat
  useEffect(() => {
    if (!activeChat?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support-inbox-msgs:${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `chat_id=eq.${activeChat.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id]);

  const openChat = async (chat: SupportChat) => {
    setActiveChat(chat);
    const res = await fetch(`/api/support/chats/${chat.id}/messages`);
    const { data } = await res.json() as { data: Message[] };
    setMessages(data ?? []);
  };

  const claimChat = async () => {
    if (!activeChat) return;
    await fetch(`/api/support/chats/${activeChat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'with_human' }),
    });
    setActiveChat((prev) => prev ? { ...prev, status: 'with_human' } : null);
  };

  const resolveChat = async () => {
    if (!activeChat) return;
    await fetch(`/api/support/chats/${activeChat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    setActiveChat((prev) => prev ? { ...prev, status: 'resolved' } : null);
  };

  const sendReply = async () => {
    if (!input.trim() || !activeChat || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      await fetch(`/api/support/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } finally {
      setSending(false);
    }
  };

  const displayed = filter === 'all' ? chats : chats.filter((c) => c.status === filter);
  const waitingCount = chats.filter((c) => c.status === 'waiting_human').length;

  return (
    <div className="flex h-full">
      {/* Sidebar: chat list */}
      <div className="w-[320px] shrink-0 border-r border-gray-100 flex flex-col h-full">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-[#300a46]">Support Inbox</h1>
            {waitingCount > 0 && (
              <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {waitingCount} waiting
              </span>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'waiting_human', 'with_human', 'bot', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                  filter === s
                    ? 'bg-[#300a46] text-white border-[#300a46]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                )}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 px-5 py-4">Loading…</p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">No chats here yet.</p>
          ) : (
            displayed.map((chat) => (
              <button
                key={chat.id}
                onClick={() => openChat(chat)}
                className={cn(
                  'w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                  activeChat?.id === chat.id && 'bg-[#fff3f0]'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-[#300a46] truncate">
                    {chat.user_name ?? chat.user_email ?? 'Anonymous'}
                  </p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium', STATUS_COLORS[chat.status])}>
                    {STATUS_LABELS[chat.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">{chat.user_email ?? '—'}</p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col h-full">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-200 block mb-3">support_agent</span>
              <p className="text-sm text-gray-400">Select a chat to view the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#300a46] truncate">
                  {activeChat.user_name ?? activeChat.user_email ?? 'Anonymous'}
                </p>
                <p className="text-xs text-gray-400 truncate">{activeChat.user_email}</p>
              </div>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[activeChat.status])}>
                {STATUS_LABELS[activeChat.status]}
              </span>
              {activeChat.status === 'waiting_human' && (
                <button
                  onClick={claimChat}
                  className="text-xs px-3 py-1.5 bg-[#300a46] text-white rounded-lg hover:bg-[#4a1566] transition-colors"
                >
                  Claim chat
                </button>
              )}
              {(activeChat.status === 'with_human' || activeChat.status === 'bot') && (
                <button
                  onClick={resolveChat}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex items-end gap-2', msg.role === 'user' ? 'justify-start' : 'justify-end')}
                >
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mb-0.5">
                      U
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] px-3 py-2 text-sm leading-relaxed rounded-2xl',
                      msg.role === 'user'
                        ? 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                        : msg.role === 'bot'
                        ? 'bg-[#300a46]/10 text-[#300a46] rounded-br-sm'
                        : 'bg-[#ff724f] text-white rounded-br-sm'
                    )}
                  >
                    {msg.role === 'bot' && (
                      <span className="text-[10px] font-semibold text-[#300a46]/60 block mb-0.5">Bot</span>
                    )}
                    {msg.content}
                  </div>
                  {msg.role !== 'user' && (
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mb-0.5',
                        msg.role === 'agent' ? 'bg-[#ff724f] text-white' : 'bg-[#300a46] text-white'
                      )}
                    >
                      {msg.role === 'agent' ? 'T' : 'SF'}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="shrink-0 p-4 bg-white border-t border-gray-100">
              {activeChat.status === 'resolved' ? (
                <p className="text-sm text-gray-400 text-center py-2">This chat has been resolved.</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                    }}
                    placeholder="Reply as team member…"
                    disabled={sending}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#300a46]/20 focus:border-[#300a46]/40 disabled:opacity-50"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!input.trim() || sending}
                    className="px-4 py-2 bg-[#ff724f] text-white text-sm rounded-xl font-medium hover:bg-[#e86040] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
