
import React, { useState, useEffect } from 'react';
import { analyticsService, EngagementOverview } from '../src/api/services/analytics';

function formatDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const ClientAnalytics: React.FC = () => {
  const [range, setRange] = useState('7D');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<EngagementOverview | null>(null);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
      const data = await analyticsService.getEngagementOverview(days);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Could not load analytics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!analytics) return;
    const rows = [
      ['date', 'ai_replies', 'human_replies', 'received'],
      ...analytics.messageVolume.map((d) => [d.date, d.ai, d.human, d.inbound]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seekers-analytics-${range.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMaxVolume = () => {
    if (!analytics?.messageVolume?.length) return 1;
    return Math.max(1, ...analytics.messageVolume.map((d) => d.ai + d.human));
  };

  const hasActivity = (analytics?.totals.received || 0) + (analytics?.totals.aiReplies || 0) > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <span className="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-6 py-2 bg-primary text-background-dark text-xs font-bold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white">Engagement Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor your AI performance and audience growth.</p>
        </div>
        <div className="flex bg-white dark:bg-surface-dark p-1 rounded-xl border border-slate-200 dark:border-border-dark">
          {['7D', '30D', '90D'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${range === r ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-primary'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart Card */}
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Reply Volume</h3>
                <p className="text-xs text-slate-400 font-medium">Daily AI vs human-agent replies.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><span className="size-2 bg-primary rounded-full"></span> <span className="text-[10px] font-bold text-slate-500 uppercase">AI Bot</span></div>
                <div className="flex items-center gap-2"><span className="size-2 bg-slate-300 rounded-full"></span> <span className="text-[10px] font-bold text-slate-500 uppercase">Human</span></div>
              </div>
            </div>
            {hasActivity ? (
              <div className="h-64 flex items-end gap-2 pb-4">
                {analytics?.messageVolume.map((d, i) => {
                  const maxVol = getMaxVolume();
                  const totalHeight = ((d.ai + d.human) / maxVol) * 100;
                  const aiHeight = (d.ai / maxVol) * 100;
                  const showLabel =
                    analytics.messageVolume.length <= 14 ||
                    i % Math.ceil(analytics.messageVolume.length / 14) === 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col gap-1 items-center group cursor-pointer" title={`${formatDay(d.date)}: ${d.ai} AI · ${d.human} human`}>
                      <div className="w-full bg-slate-100 dark:bg-background-dark rounded-t-lg relative overflow-hidden h-full">
                        <div className="absolute bottom-0 w-full bg-primary/20 group-hover:bg-primary/40 transition-all" style={{ height: `${totalHeight}%` }}></div>
                        <div className="absolute bottom-0 w-full bg-primary group-hover:brightness-110 transition-all" style={{ height: `${aiHeight}%` }}></div>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold">{showLabel ? formatDay(d.date) : ''}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">monitoring</span>
                <p className="text-sm">No activity in this period yet</p>
                <p className="text-xs mt-1">Data appears here as customers message your connected accounts.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold dark:text-white mb-4">Platform Breakdown</h3>
              <div className="space-y-4">
                {(analytics?.platforms || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No platform activity yet.</p>
                ) : (
                  analytics!.platforms.map((p) => {
                    const maxMsgs = Math.max(1, ...analytics!.platforms.map((x) => x.messages));
                    return (
                      <div key={p.platform}>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span className="text-slate-400">
                            {p.platform === 'instagram' ? '📸 Instagram' : '💬 Facebook'}
                          </span>
                          <span className="dark:text-white">
                            {p.messages.toLocaleString()} msgs · {p.conversations.toLocaleString()} chats
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(p.messages / maxMsgs) * 100}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold dark:text-white mb-4">Conversations</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Total', analytics?.conversations.total || 0],
                  ['Active', analytics?.conversations.active || 0],
                  ['Direct messages', analytics?.conversations.dms || 0],
                  ['Comment threads', analytics?.conversations.comments || 0],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-slate-50 dark:bg-background-dark rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-xl font-black dark:text-white">{(value as number).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col items-center text-center">
             <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-4xl">workspace_premium</span>
             </div>
             <h3 className="text-lg font-black dark:text-white">AI Efficiency</h3>
             <p className="text-4xl font-black text-primary my-4">
               {(analytics?.totals.aiEfficiency || 0).toFixed(1)}%
             </p>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
               Your AI sent {(analytics?.totals.aiReplies || 0).toLocaleString()} of{' '}
               {((analytics?.totals.aiReplies || 0) + (analytics?.totals.humanReplies || 0)).toLocaleString()}{' '}
               replies in this period, answering {(analytics?.totals.received || 0).toLocaleString()} incoming
               messages and comments.
             </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={!analytics}
            className="w-full py-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Download CSV Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAnalytics;
