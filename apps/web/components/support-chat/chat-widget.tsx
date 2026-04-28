'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'bot' | 'agent';
  content: string;
  created_at: string;
}

interface Chat {
  id: string;
  status: 'bot' | 'waiting_human' | 'with_human' | 'resolved';
}

function renderMessage(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      )}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false); // ref so rapid Enter/click can't race past the guard
  const [botTyping, setBotTyping] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState(false);
  const [showJoinBanner, setShowJoinBanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Scroll when messages or typing indicator change
  useEffect(() => { scrollToBottom(); }, [messages, botTyping, scrollToBottom]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    if (msg.role === 'bot' || msg.role === 'agent') setBotTyping(false);
  }, []);

  // Realtime: incoming messages + chat status updates
  useEffect(() => {
    if (!chat?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`support-chat:${chat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => appendMessage(payload.new as Message)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_chats', filter: `id=eq.${chat.id}` },
        (payload) => {
          const newStatus = payload.new.status as Chat['status'];
          setChat((prev) => prev ? { ...prev, status: newStatus } : null);
          if (newStatus === 'with_human') {
            setShowJoinBanner(true);
            setTimeout(() => setShowJoinBanner(false), 4000);
          }
          if (newStatus === 'resolved') {
            setMessages((prev) => [
              ...prev,
              {
                id: `sys-resolved-${Date.now()}`,
                role: 'bot',
                content: 'This conversation has been closed by our team. Thank you for reaching out! Feel free to start a new chat if you need further help.',
                created_at: new Date().toISOString(),
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat?.id, appendMessage]);

  const initChat = useCallback(async () => {
    setInitializing(true);
    setInitError(false);
    try {
      const res = await fetch('/api/support/chats', { method: 'POST' });
      const json = await res.json() as { data: Chat; error?: string };
      if (!json.data) {
        console.error('[SupportChat] init failed:', res.status, json.error);
        setInitError(true);
        return;
      }
      const chatData = json.data;
      setChat(chatData);

      const msgRes = await fetch(`/api/support/chats/${chatData.id}/messages`);
      const { data: msgs } = await msgRes.json() as { data: Message[] };
      setMessages(msgs ?? []);
    } catch {
      setInitError(true);
    } finally {
      setInitializing(false);
    }
  }, []);

  const handleToggle = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true);
    if (!chat) await initChat();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !chat || sendingRef.current) return;
    const trimmed = content.trim();
    setInput('');
    sendingRef.current = true;
    setSending(true);

    // Show user message instantly (optimistic)
    const tempId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: trimmed, created_at: new Date().toISOString() },
    ]);
    if (chat.status === 'bot') setBotTyping(true);

    try {
      const res = await fetch(`/api/support/chats/${chat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const { data } = await res.json() as {
        data: { userMessage: Message; botMessage: Message | null };
      };

      // Replace optimistic bubble with real messages from API response
      setMessages((prev) => {
        const base = prev.filter((m) => m.id !== tempId);
        const toAdd: Message[] = [];
        if (data?.userMessage && !base.some((m) => m.id === data.userMessage.id))
          toAdd.push(data.userMessage);
        if (data?.botMessage && !base.some((m) => m.id === data.botMessage!.id))
          toAdd.push(data.botMessage);
        return [...base, ...toAdd];
      });
      if (data?.botMessage) setBotTyping(false);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBotTyping(false);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const statusText =
    chat?.status === 'waiting_human' ? 'Connecting to team member...' :
    chat?.status === 'with_human'    ? 'Team member is here' :
    'ScaleFeedback Support';

  const statusDot =
    chat?.status === 'with_human'    ? 'bg-green-400' :
    chat?.status === 'waiting_human' ? 'bg-amber-400 animate-pulse' :
    'bg-green-400';

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-[88px] right-6 z-50 w-[360px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#300a46] text-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#ff724f] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[20px]">smart_toy</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Support Chat</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
                <p className="text-xs text-white/70 truncate">{statusText}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/80">
            {initializing ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">Loading…</p>
              </div>
            ) : initError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-gray-500 text-center px-4">Couldn't connect. Please try again.</p>
                <button
                  onClick={initChat}
                  className="text-xs px-3 py-1.5 bg-[#300a46] text-white rounded-lg hover:bg-[#4a1566] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {messages.filter((msg, i, arr) => arr.findIndex(m => m.id === msg.id) === i).map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex items-end gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role !== 'user' && (
                      <div className="w-6 h-6 rounded-full bg-[#300a46] flex items-center justify-center shrink-0 mb-0.5">
                        {msg.role === 'agent'
                          ? <span className="material-symbols-outlined text-white text-[13px]">person</span>
                          : <span className="material-symbols-outlined text-white text-[13px]">smart_toy</span>
                        }
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[78%] px-3 py-2 text-sm leading-relaxed rounded-2xl',
                        msg.role === 'user'
                          ? 'bg-[#300a46] text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                      )}
                    >
                      {renderMessage(msg.content)}
                    </div>
                  </div>
                ))}

                {/* Typing indicator — shows while waiting for bot/agent reply */}
                {(botTyping || sending) && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-[#300a46] flex items-center justify-center shrink-0 mb-0.5">
                      <span className="material-symbols-outlined text-white text-[13px]">smart_toy</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                      <span className="flex gap-1 items-center h-4">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status banners */}
          {chat?.status === 'waiting_human' && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 text-center shrink-0">
              Waiting for a team member to join…
            </div>
          )}
          {showJoinBanner && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100 text-xs text-green-700 text-center shrink-0 transition-opacity">
              A team member has joined this chat
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 p-3 bg-white border-t border-gray-100">
            {chat?.status === 'bot' && (
              <button
                onClick={async () => {
                  if (!chat) return;
                  await fetch(`/api/support/chats/${chat.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'waiting_human' }),
                  });
                  setChat((prev) => prev ? { ...prev, status: 'waiting_human' } : null);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `sys-${Date.now()}`,
                      role: 'bot',
                      content: "I've notified our team. A team member will join this chat shortly. Feel free to describe your issue in more detail while you wait.",
                      created_at: new Date().toISOString(),
                    },
                  ]);
                }}
                className="w-full mb-2 text-[11px] text-[#300a46]/50 hover:text-[#ff724f] transition-colors text-center"
              >
                Connect with team member →
              </button>
            )}
            {chat?.status === 'resolved' ? (
              <p className="text-xs text-gray-400 text-center py-1">This chat has been closed.</p>
            ) : null}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder={
                  chat?.status === 'waiting_human' ? 'Describe your issue while you wait…' : 'Type a message…'
                }
                disabled={sending || initializing || chat?.status === 'resolved'}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#300a46]/20 focus:border-[#300a46]/40 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending || initializing}
                className="w-9 h-9 shrink-0 rounded-xl bg-[#300a46] text-white flex items-center justify-center hover:bg-[#4a1566] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#ff724f] shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        aria-label="Support chat"
      >
        <span className="material-symbols-outlined text-white text-[24px]">
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>
    </>
  );
}
