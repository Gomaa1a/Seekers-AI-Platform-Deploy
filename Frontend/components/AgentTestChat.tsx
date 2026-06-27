import React, { useState, useRef, useEffect } from 'react';
import { agentService } from '../src/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentTestChatProps {
  agentId: string;
  greeting?: string;
  className?: string;
}

const AgentTestChat: React.FC<AgentTestChatProps> = ({ agentId, greeting, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    greeting ? [{ role: 'assistant', content: greeting }] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'live' | 'preview' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const history = messages.slice(-8); // keep last few turns for context
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setSending(true);
    try {
      const { reply, mode: replyMode } = await agentService.test(agentId, text, history);
      setMode(replyMode);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages([
        ...next,
        { role: 'assistant', content: '⚠️ ' + (e?.response?.data?.message || 'Something went wrong. Try again.') },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col rounded-3xl border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-border-dark bg-white/50 dark:bg-surface-dark/50">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Test conversation</span>
        </div>
        {mode === 'preview' && (
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
            Preview · add LLM key for live AI
          </span>
        )}
        {mode === 'live' && (
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            Live AI
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-[260px] max-h-[360px] overflow-y-auto p-5 space-y-3 no-scrollbar">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 font-medium py-10">
            Say hi 👋 — try asking what your agent knows.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-background-dark rounded-br-md'
                  : 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark dark:text-white rounded-bl-md'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark">
              <span className="flex gap-1">
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-slate-200 dark:border-border-dark bg-white/50 dark:bg-surface-dark/50 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a customer message…"
          className="flex-1 bg-white dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all dark:text-white"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="size-11 shrink-0 rounded-2xl bg-primary text-background-dark flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
};

export default AgentTestChat;
