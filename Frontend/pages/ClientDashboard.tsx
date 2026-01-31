
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation, WorkflowRequest } from '../types';
import Modal from '../components/Modal';
import { analyticsService, metaService } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

interface DashboardStats {
  totalInteractions: number;
  botEfficiency: number;
  leadsGenerated: number;
  costSavings: number;
  trends: {
    interactions: number;
    efficiency: number;
    leads: number;
    savings: number;
  };
}

interface NodeStatus {
  node: string;
  status: 'Optimal' | 'Degraded' | 'Offline';
  latency: string;
}

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modalType, setModalType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInteractions: 0,
    botEfficiency: 0,
    leadsGenerated: 0,
    costSavings: 0,
    trends: { interactions: 0, efficiency: 0, leads: 0, savings: 0 }
  });
  
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatus[]>([
    { node: 'Messenger Edge', status: 'Offline', latency: '-' },
    { node: 'Instagram Relay', status: 'Offline', latency: '-' },
    { node: 'Webhook Cluster', status: 'Offline', latency: '-' },
    { node: 'AI Knowledge Base', status: 'Offline', latency: '-' },
  ]);
  
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch analytics dashboard data
      const analytics = await analyticsService.getDashboardStats();
      
      setDashboardStats({
        totalInteractions: analytics.total_interactions || 0,
        botEfficiency: analytics.bot_efficiency || 0,
        leadsGenerated: analytics.leads_generated || 0,
        costSavings: analytics.cost_savings || 0,
        trends: {
          interactions: analytics.trends?.interactions || 0,
          efficiency: analytics.trends?.efficiency || 0,
          leads: analytics.trends?.leads || 0,
          savings: analytics.trends?.savings || 0,
        }
      });
      
      // Set chart data from analytics
      setChartData(analytics.chart_data || [45, 60, 40, 80, 55, 75, 90, 65, 85, 40, 95, 70]);
      
      // Check Meta connection status
      try {
        const metaStatus = await metaService.getConnectionStatus();
        updateNodeStatuses(metaStatus.connected);
      } catch {
        updateNodeStatuses(false);
      }
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
      // Set fallback data
      setChartData([45, 60, 40, 80, 55, 75, 90, 65, 85, 40, 95, 70]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNodeStatuses = (metaConnected: boolean) => {
    setNodeStatuses([
      { 
        node: 'Messenger Edge', 
        status: metaConnected ? 'Optimal' : 'Offline', 
        latency: metaConnected ? '12ms' : '-' 
      },
      { 
        node: 'Instagram Relay', 
        status: metaConnected ? 'Optimal' : 'Offline', 
        latency: metaConnected ? '18ms' : '-' 
      },
      { 
        node: 'Webhook Cluster', 
        status: 'Optimal', 
        latency: '24ms' 
      },
      { 
        node: 'AI Knowledge Base', 
        status: 'Optimal', 
        latency: '8ms' 
      },
    ]);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toLocaleString();
  };

  const formatTrend = (trend: number): string => {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const stats = [
    { 
      label: 'Total Interactions', 
      value: formatNumber(dashboardStats.totalInteractions), 
      trend: formatTrend(dashboardStats.trends.interactions), 
      icon: 'forum', 
      color: 'text-primary' 
    },
    { 
      label: 'Bot Efficiency', 
      value: `${dashboardStats.botEfficiency.toFixed(1)}%`, 
      trend: formatTrend(dashboardStats.trends.efficiency), 
      icon: 'bolt', 
      color: 'text-emerald-500' 
    },
    { 
      label: 'Leads Generated', 
      value: formatNumber(dashboardStats.leadsGenerated), 
      trend: formatTrend(dashboardStats.trends.leads), 
      icon: 'group_add', 
      color: 'text-indigo-400' 
    },
    { 
      label: 'Cost Savings', 
      value: `$${formatNumber(dashboardStats.costSavings)}`, 
      trend: formatTrend(dashboardStats.trends.savings), 
      icon: 'payments', 
      color: 'text-amber-500' 
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="flex flex-wrap justify-between items-end gap-6">
        <div>
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">WORKSPACE OVERVIEW</p>
          <h2 className="text-4xl font-extrabold tracking-tight">Mission Control</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/workflows/new')}
            className="px-8 py-3.5 bg-primary text-background-dark rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
          >
            Request Automation
          </button>
        </div>
      </div>

      {/* High-Level Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="presentation-card p-8 rounded-[2.5rem] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-[40px] -z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className={`size-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <span className="text-emerald-500 text-[9px] font-black bg-emerald-500/10 px-2 py-1 rounded uppercase tracking-wider">{stat.trend}</span>
              </div>
              <p className="text-4xl font-extrabold mb-1 tracking-tight">{stat.value}</p>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Performance Graph Placeholder */}
        <div className="xl:col-span-8 presentation-card p-8 rounded-[2.5rem]">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-lg font-black tracking-tight">System Throughput</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-2"><span className="size-2 bg-primary rounded-full"></span> <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">AI Logic</span></div>
              <div className="flex items-center gap-2"><span className="size-2 bg-indigo-400 rounded-full"></span> <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data Sink</span></div>
            </div>
          </div>
          <div className="h-64 flex items-end gap-3 px-4">
            {chartData.map((h, i) => (
              <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group h-full">
                <div className="absolute bottom-0 w-full bg-primary/20 rounded-t-lg group-hover:bg-primary/40 transition-all" style={{ height: `${h}%` }}></div>
                <div className="absolute bottom-0 w-full bg-primary/40 rounded-t-lg transition-all" style={{ height: `${Math.max(0, h-20)}%` }}></div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-4">
            <span>Oct 01</span>
            <span>Oct 15</span>
            <span>Today</span>
          </div>
        </div>

        {/* Real-time Status Area */}
        <div className="xl:col-span-4 presentation-card p-8 rounded-[2.5rem] flex flex-col">
          <h3 className="text-lg font-black tracking-tight mb-8">Node Connectivity</h3>
          <div className="space-y-6 flex-1">
             {nodeStatuses.map((n, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                 <div className="flex items-center gap-3">
                   <div className={`size-2 rounded-full ${
                     n.status === 'Optimal' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                     n.status === 'Degraded' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                     'bg-slate-500'
                   }`}></div>
                   <p className="text-xs font-black uppercase tracking-widest text-slate-300">{n.node}</p>
                 </div>
                 <span className="text-[10px] font-black text-slate-500">{n.latency}</span>
               </div>
             ))}
          </div>
          <button 
            onClick={() => navigate('/connected-accounts')}
            className="w-full mt-10 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all"
          >
            Full Network Trace
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background-dark/50 flex items-center justify-center z-50">
          <div className="bg-surface-dark rounded-2xl p-8 flex flex-col items-center gap-4">
            <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
            <p className="text-sm font-bold text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
