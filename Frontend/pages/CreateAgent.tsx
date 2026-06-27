import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../src/api';
import type { AgentChannel, AgentTone } from '../src/api';
import AgentTestChat from '../components/AgentTestChat';

const TONES: { value: AgentTone; label: string; icon: string }[] = [
  { value: 'friendly', label: 'Friendly', icon: 'sentiment_satisfied' },
  { value: 'professional', label: 'Professional', icon: 'work' },
  { value: 'casual', label: 'Casual', icon: 'waving_hand' },
  { value: 'formal', label: 'Formal', icon: 'gavel' },
  { value: 'empathetic', label: 'Empathetic', icon: 'volunteer_activism' },
];

// WhatsApp is intentionally disabled for now — re-add { value: 'whatsapp', ... } to bring it back.
const CHANNELS: { value: AgentChannel; label: string; icon: string; hint: string }[] = [
  { value: 'facebook', label: 'Facebook', icon: 'thumb_up', hint: 'Messenger & page comments' },
  { value: 'instagram', label: 'Instagram', icon: 'photo_camera', hint: 'DMs & comment replies' },
  { value: 'web', label: 'Website', icon: 'language', hint: 'Embed a chat widget on your site' },
];

const STEPS = ['Basics', 'Knowledge', 'Test', 'Channel', 'Go live'];

const CreateAgent: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [tone, setTone] = useState<AgentTone>('friendly');
  const [greeting, setGreeting] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [channel, setChannel] = useState<AgentChannel>('facebook');

  const go = (n: number) => { setError(null); setStep(n); };

  // Step 1 -> create the draft agent
  const submitBasics = async () => {
    if (!name.trim()) { setError('Give your agent a name to continue.'); return; }
    setSaving(true); setError(null);
    try {
      if (agentId) {
        await agentService.update(agentId, { name, businessType, tone, greeting });
      } else {
        const agent = await agentService.create({ name, businessType, tone, greeting });
        setAgentId(agent.id);
      }
      go(2);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  };

  // Step 2 -> attach knowledge
  const submitKnowledge = async () => {
    if (!agentId) return;
    setSaving(true); setError(null);
    try {
      await agentService.update(agentId, { knowledge });
      go(3);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save knowledge.');
    } finally { setSaving(false); }
  };

  // Step 3 -> connect the channel
  const submitChannel = async () => {
    if (!agentId) return;
    setSaving(true); setError(null);
    try {
      await agentService.connectChannel(agentId, channel);
      go(5);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not connect channel.');
    } finally { setSaving(false); }
  };

  const saveDraft = () => navigate('/agents');

  const goLive = async () => {
    if (!agentId) return;
    setSaving(true); setError(null);
    try {
      await agentService.activate(agentId);
      navigate('/agents');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not activate the agent.');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl px-5 py-4 text-sm font-bold focus:border-primary outline-none transition-all dark:text-white';
  const labelCls = 'text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/agents')} className="text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-base">arrow_back</span> Agents
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight dark:text-white">Create your AI agent</h1>
        <p className="text-slate-500 font-medium mt-2">Four quick steps and your agent is answering customers.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step, done = n < step;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`size-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${active ? 'bg-primary text-background-dark scale-110 shadow-lg shadow-primary/20' : done ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-background-dark text-slate-400'}`}>
                  {done ? <span className="material-symbols-outlined text-base">check</span> : n}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest hidden sm:block ${active ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
              </div>
              {n < STEPS.length && <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-primary/40' : 'bg-slate-100 dark:bg-border-dark'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="presentation-card rounded-3xl p-7 md:p-10">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span> {error}
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className={labelCls}>Agent name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nour from Acme Store" />
            </div>
            <div>
              <label className={labelCls}>What does your business do?</label>
              <input className={inputCls} value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Online fashion store" />
            </div>
            <div>
              <label className={labelCls}>Tone of voice</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${tone === t.value ? 'bg-primary/10 border-primary text-primary scale-105' : 'bg-white/0 border-slate-200 dark:border-border-dark text-slate-400 hover:border-primary/50'}`}>
                    <span className="material-symbols-outlined">{t.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Greeting message (optional)</label>
              <input className={inputCls} value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Hi! 👋 How can I help you today?" />
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={submitBasics} disabled={saving} className="px-10 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Knowledge */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className={labelCls}>Teach your agent</label>
              <p className="text-sm text-slate-500 font-medium mb-3">Paste your FAQs, policies, product details, hours — anything your agent should know. It learns instantly.</p>
              <textarea className={`${inputCls} min-h-[220px] resize-y leading-relaxed`} value={knowledge} onChange={e => setKnowledge(e.target.value)}
                placeholder={'Example:\n\nBusiness hours: Sun–Thu, 9am–6pm (Cairo).\nShipping: 2–4 days across Egypt, free over 1000 EGP.\nReturns: accepted within 14 days in original packaging.'} />
              <p className="text-[11px] text-slate-400 font-bold mt-2">{knowledge.trim() ? `${knowledge.trim().split(/\s+/).length} words` : 'You can add this later, too.'}</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => go(1)} className="px-6 py-4 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Back</button>
              <button onClick={submitKnowledge} disabled={saving} className="px-10 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Test */}
        {step === 3 && agentId && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className={labelCls}>Try it before you connect</label>
              <p className="text-sm text-slate-500 font-medium mb-4">
                Chat with your agent here using the knowledge you added. Happy with it? Continue to connect a channel.
              </p>
              <AgentTestChat agentId={agentId} greeting={greeting || undefined} />
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => go(2)} className="px-6 py-4 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Back</button>
              <button onClick={() => go(4)} className="px-10 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all">
                Looks good — continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Channel */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className={labelCls}>Where should it answer?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CHANNELS.map(c => (
                  <button key={c.value} onClick={() => setChannel(c.value)}
                    className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${channel === c.value ? 'bg-primary/10 border-primary scale-[1.02]' : 'border-slate-200 dark:border-border-dark hover:border-primary/50'}`}>
                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${channel === c.value ? 'bg-primary text-background-dark' : 'bg-slate-100 dark:bg-background-dark text-slate-400'}`}>
                      <span className="material-symbols-outlined">{c.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white">{c.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium leading-snug mt-0.5">{c.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                For the demo this links instantly. In production it opens the channel's OAuth connect.
              </p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => go(3)} className="px-6 py-4 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Back</button>
              <button onClick={submitChannel} disabled={saving} className="px-10 py-4 bg-primary text-background-dark rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'Connecting…' : 'Connect & continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review / Go live */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center py-2">
              <div className="size-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl font-black">rocket_launch</span>
              </div>
              <h3 className="text-2xl font-black dark:text-white tracking-tight">{name || 'Your agent'} is ready</h3>
              <p className="text-slate-500 font-medium mt-1">Take it live and it starts answering on {CHANNELS.find(c => c.value === channel)?.label} right away.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tone', value: TONES.find(t => t.value === tone)?.label },
                { label: 'Channel', value: CHANNELS.find(c => c.value === channel)?.label },
                { label: 'Knowledge', value: knowledge.trim() ? `${knowledge.trim().split(/\s+/).length} words` : 'None yet' },
                { label: 'Business', value: businessType || '—' },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl bg-slate-50 dark:bg-background-dark border border-slate-100 dark:border-border-dark">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                  <p className="text-sm font-black dark:text-white truncate">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              {['Emotion detection', 'Lead extraction', 'Human handoff'].map(f => (
                <span key={f} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check</span>{f}
                </span>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={saveDraft} className="px-6 py-4 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Save as draft</button>
              <button onClick={goLive} disabled={saving} className="px-10 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'Going live…' : '🚀 Go live'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAgent;
