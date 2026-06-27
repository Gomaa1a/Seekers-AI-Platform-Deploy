import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../src/api';
import type { AiAgent, AgentStats } from '../src/api';
import Modal from '../components/Modal';
import AgentTestChat from '../components/AgentTestChat';

const CHANNEL_META: Record<string, { label: string; icon: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'chat' },
  facebook: { label: 'Facebook', icon: 'thumb_up' },
  instagram: { label: 'Instagram', icon: 'photo_camera' },
  web: { label: 'Website', icon: 'language' },
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: 'Live', cls: 'bg-emerald-500/10 text-emerald-500', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', cls: 'bg-slate-400/10 text-slate-400', dot: 'bg-slate-400' },
  paused: { label: 'Paused', cls: 'bg-amber-500/10 text-amber-500', dot: 'bg-amber-500' },
};

const ClientAgents: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testAgent, setTestAgent] = useState<AiAgent | null>(null);

  const load = async () => {
    try {
      const [a, s] = await Promise.all([agentService.list(), agentService.stats()]);
      setAgents(a);
      setStats(s);
    } catch {
      // surfaced as empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (agent: AiAgent) => {
    setBusyId(agent.id);
    try {
      if (agent.status === 'active') await agentService.pause(agent.id);
      else await agentService.activate(agent.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Action failed. Make sure a channel is connected.');
    } finally { setBusyId(null); }
  };

  const remove = async (agent: AiAgent) => {
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    setBusyId(agent.id);
    try { await agentService.delete(agent.id); await load(); }
    finally { setBusyId(null); }
  };

  const statCards = [
    { label: 'Total agents', value: stats?.total ?? 0, icon: 'smart_toy' },
    { label: 'Live', value: stats?.active ?? 0, icon: 'bolt' },
    { label: 'Drafts', value: stats?.draft ?? 0, icon: 'edit_note' },
    { label: 'Messages handled', value: stats?.totalMessages ?? 0, icon: 'forum' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight dark:text-white">AI Agents</h1>
          <p className="text-slate-500 font-medium mt-1">Create, train, and launch agents that answer your customers.</p>
        </div>
        <button onClick={() => navigate('/agents/new')} className="px-7 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">add</span> New Agent
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(c => (
          <div key={c.label} className="presentation-card rounded-2xl p-5 flex items-center gap-4">
            <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-extrabold dark:text-white tracking-tight">{c.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="presentation-card rounded-3xl p-12 text-center">
          <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-3xl">smart_toy</span>
          </div>
          <h3 className="text-xl font-black dark:text-white mb-2">No agents yet</h3>
          <p className="text-slate-500 font-medium mb-6">Spin up your first AI agent — it takes about a minute.</p>
          <button onClick={() => navigate('/agents/new')} className="px-8 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] transition-all">
            Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {agents.map(agent => {
            const ch = CHANNEL_META[agent.channel] || CHANNEL_META.web;
            const st = STATUS_META[agent.status] || STATUS_META.draft;
            return (
              <div key={agent.id} className="presentation-card rounded-3xl p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-black dark:text-white truncate">{agent.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 truncate">{agent.business_type || 'AI Support Agent'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${st.cls}`}>
                    <span className={`size-1.5 rounded-full ${st.dot} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />{st.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-background-dark text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">{ch.icon}</span>{ch.label}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-background-dark text-slate-400 text-[10px] font-black uppercase tracking-widest">{agent.tone}</span>
                  {agent.channel_connected
                    ? <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Connected</span>
                    : <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest">Not connected</span>}
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <button onClick={() => toggle(agent)} disabled={busyId === agent.id}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${agent.status === 'active' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'}`}>
                    {busyId === agent.id ? '…' : agent.status === 'active' ? 'Pause' : 'Go live'}
                  </button>
                  <button onClick={() => setTestAgent(agent)} title="Test"
                    className="size-11 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-background-dark flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-lg">forum</span>
                  </button>
                  <button onClick={() => navigate('/agents/new')} title="Edit"
                    className="size-11 rounded-2xl bg-slate-100 dark:bg-background-dark text-slate-400 hover:text-primary flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-lg">tune</span>
                  </button>
                  <button onClick={() => remove(agent)} disabled={busyId === agent.id} title="Delete"
                    className="size-11 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!testAgent}
        onClose={() => setTestAgent(null)}
        title={testAgent ? `Test · ${testAgent.name}` : 'Test agent'}
      >
        {testAgent && (
          <AgentTestChat
            key={testAgent.id}
            agentId={testAgent.id}
            greeting={testAgent.greeting || undefined}
          />
        )}
      </Modal>
    </div>
  );
};

export default ClientAgents;
