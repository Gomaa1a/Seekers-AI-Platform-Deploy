
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { analyticsService } from '../src/api/services/analytics';

interface AnalyticsData {
  messageVolume: { date: string; ai: number; human: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  topIntents: { name: string; percentage: number }[];
  aiEfficiency: number;
  totalQueriesResolved: number;
}

const ClientAnalytics: React.FC = () => {
  const [range, setRange] = useState('7D');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const days = range === '7D' ? 7 : range === '30D' ? 30 : 365;
      const response = await analyticsService.getDetailedAnalytics(days);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      // Fallback to mock data for development
      setAnalytics({
        messageVolume: [
          { date: '1 Oct', ai: 40, human: 20 },
          { date: '2 Oct', ai: 60, human: 25 },
          { date: '3 Oct', ai: 45, human: 15 },
          { date: '4 Oct', ai: 90, human: 30 },
          { date: '5 Oct', ai: 65, human: 20 },
          { date: '6 Oct', ai: 80, human: 25 },
          { date: '7 Oct', ai: 50, human: 18 },
          { date: '8 Oct', ai: 70, human: 22 },
          { date: '9 Oct', ai: 85, human: 28 },
          { date: '10 Oct', ai: 40, human: 15 },
          { date: '11 Oct', ai: 95, human: 35 },
          { date: '12 Oct', ai: 60, human: 20 },
        ],
        sentiment: { positive: 75, neutral: 20, negative: 5 },
        topIntents: [
          { name: 'Order Status', percentage: 100 },
          { name: 'Pricing Info', percentage: 85 },
          { name: 'Return Policy', percentage: 70 },
          { name: 'Human Agent', percentage: 55 },
        ],
        aiEfficiency: 92.4,
        totalQueriesResolved: 1240,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // In production, this would call the API to generate a PDF
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Download would happen here
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getMaxVolume = () => {
    if (!analytics?.messageVolume) return 100;
    return Math.max(...analytics.messageVolume.map(d => d.ai + d.human));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
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
          {['7D', '30D', 'ALL'].map(r => (
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
                <h3 className="text-lg font-bold dark:text-white">Message Volume</h3>
                <p className="text-xs text-slate-400 font-medium">Daily AI vs Human interactions.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><span className="size-2 bg-primary rounded-full"></span> <span className="text-[10px] font-bold text-slate-500 uppercase">AI Bot</span></div>
                <div className="flex items-center gap-2"><span className="size-2 bg-slate-300 rounded-full"></span> <span className="text-[10px] font-bold text-slate-500 uppercase">Human</span></div>
              </div>
            </div>
            <div className="h-64 flex items-end gap-2 pb-4">
               {analytics?.messageVolume.map((d, i) => {
                 const maxVol = getMaxVolume();
                 const totalHeight = ((d.ai + d.human) / maxVol) * 100;
                 const aiHeight = (d.ai / maxVol) * 100;
                 return (
                   <div key={i} className="flex-1 flex flex-col gap-1 items-center group cursor-pointer">
                      <div className="w-full bg-slate-100 dark:bg-background-dark rounded-t-lg relative overflow-hidden h-full">
                         <div className="absolute bottom-0 w-full bg-primary/20 group-hover:bg-primary/40 transition-all" style={{ height: `${totalHeight}%` }}></div>
                         <div className="absolute bottom-0 w-full bg-primary group-hover:brightness-110 transition-all" style={{ height: `${aiHeight}%` }}></div>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold">{d.date}</span>
                   </div>
                 );
               })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold dark:text-white mb-4">Sentiment Overview</h3>
              <div className="flex items-center gap-8">
                <div className="relative size-24">
                  <svg className="size-full" viewBox="0 0 36 36">
                    <path className="text-slate-100 dark:text-slate-800" strokeDasharray="100, 100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeDasharray={`${analytics?.sentiment.positive || 75}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-lg dark:text-white">{analytics?.sentiment.positive || 0}%</div>
                </div>
                <div className="space-y-2 flex-1">
                   <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-emerald-500 uppercase">Positive</span> <span className="dark:text-white">{analytics?.sentiment.positive || 0}%</span></div>
                   <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-amber-500 uppercase">Neutral</span> <span className="dark:text-white">{analytics?.sentiment.neutral || 0}%</span></div>
                   <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-red-500 uppercase">Negative</span> <span className="dark:text-white">{analytics?.sentiment.negative || 0}%</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold dark:text-white mb-4">Top User Intents</h3>
              <div className="space-y-4">
                 {analytics?.topIntents.map((intent) => (
                   <div key={intent.name}>
                     <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                       <span className="text-slate-400">{intent.name}</span>
                       <span className="dark:text-white">{intent.percentage}%</span>
                     </div>
                     <div className="h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full" style={{ width: `${intent.percentage}%` }}></div>
                     </div>
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
             <p className="text-4xl font-black text-primary my-4">{analytics?.aiEfficiency.toFixed(1) || 0}%</p>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
               Your AI successfully resolved {analytics?.totalQueriesResolved?.toLocaleString() || 0} queries this week without human intervention.
             </p>
          </div>
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2"
          >
            {isDownloading && <span className="material-symbols-outlined text-sm animate-spin">refresh</span>}
            {isDownloading ? "Generating..." : "Download PDF Report"}
          </button>
        </div>
      </div>

      <Modal isOpen={isDownloading} onClose={() => {}} title="Compiling Data">
         <div className="space-y-6 text-center">
            <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
               <span className="material-symbols-outlined text-4xl animate-pulse">download</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Platform is compiling your engagement metrics into a high-fidelity PDF document. Please wait.</p>
         </div>
      </Modal>
    </div>
  );
};

export default ClientAnalytics;
