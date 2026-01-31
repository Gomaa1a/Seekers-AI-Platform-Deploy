
import React, { useState, useEffect } from 'react';
import { adminService } from '../src/api/services/admin';

interface PlatformMetrics {
  totalMrr: number;
  avgLtv: number;
  apiUptime: number;
  workerLoad: number;
  mrrTrend: string;
  ltvTrend: string;
  uptimeStatus: string;
  workerTrend: string;
}

interface ThroughputMetric {
  name: string;
  count: string;
  percentage: number;
}

const AdminPlatformAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<number[]>([]);
  const [throughput, setThroughput] = useState<ThroughputMetric[]>([]);

  useEffect(() => {
    fetchPlatformAnalytics();
  }, []);

  const fetchPlatformAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getPlatformAnalytics();
      if (response.data) {
        setMetrics(response.data.metrics);
        setRevenueData(response.data.revenueData || []);
        setThroughput(response.data.throughput || []);
      }
    } catch (err) {
      console.error('Failed to fetch platform analytics:', err);
      // Fallback to mock data
      setMetrics({
        totalMrr: 142500,
        avgLtv: 4200,
        apiUptime: 99.99,
        workerLoad: 42,
        mrrTrend: '+12%',
        ltvTrend: '+5%',
        uptimeStatus: 'Stable',
        workerTrend: '-2%'
      });
      setRevenueData([30, 45, 40, 60, 55, 75, 70, 90, 85, 100, 95, 110]);
      setThroughput([
        { name: 'Automation Executions', count: '1.2M', percentage: 75 },
        { name: 'Meta Webhooks', count: '4.8M', percentage: 90 },
        { name: 'Knowledge Queries', count: '890k', percentage: 60 },
        { name: 'DB Writes', count: '2.4M', percentage: 45 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total MRR', val: formatCurrency(metrics?.totalMrr || 0), trend: metrics?.mrrTrend || '+0%', icon: 'payments' },
    { label: 'Avg LTV', val: formatCurrency(metrics?.avgLtv || 0), trend: metrics?.ltvTrend || '+0%', icon: 'trending_up' },
    { label: 'API Uptime', val: `${metrics?.apiUptime || 0}%`, trend: metrics?.uptimeStatus || 'Unknown', icon: 'dns' },
    { label: 'Worker Load', val: `${metrics?.workerLoad || 0}%`, trend: metrics?.workerTrend || '0%', icon: 'speed' },
  ];

  const maxRevenue = Math.max(...revenueData, 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black dark:text-white">Platform Health & KPIs</h1>
        <p className="text-slate-500 dark:text-slate-400">Aggregate platform performance and revenue metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {kpiCards.map(s => (
           <div key={s.label} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between items-start mb-4">
                <div className="size-10 rounded-xl bg-slate-50 dark:bg-background-dark flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  s.trend.startsWith('+') ? 'text-emerald-500 bg-emerald-500/10' :
                  s.trend.startsWith('-') ? 'text-red-500 bg-red-500/10' :
                  'text-blue-500 bg-blue-500/10'
                }`}>{s.trend}</span>
             </div>
             <p className="text-3xl font-black dark:text-white">{s.val}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-8">Revenue Growth (12 Months)</h3>
          <div className="h-64 flex items-end gap-2">
             {revenueData.map((h, i) => (
               <div key={i} className="flex-1 bg-primary/10 rounded-t h-full relative">
                  <div className="absolute bottom-0 w-full bg-primary rounded-t" style={{ height: `${(h / maxRevenue) * 100}%` }}></div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-8">System Throughput</h3>
          <div className="space-y-6">
             {throughput.map(r => (
               <div key={r.name}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span className="text-slate-400">{r.name}</span>
                    <span className="dark:text-white">{r.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${r.percentage}%` }}></div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlatformAnalytics;
