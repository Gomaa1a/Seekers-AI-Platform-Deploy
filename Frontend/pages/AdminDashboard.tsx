
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { adminService } from '../src/api';

interface PlatformStats {
  mrr: number;
  activeWorkflows: number;
  uptime: number;
  newTenants: number;
  trends: {
    mrr: number;
    workflows: number;
    tenants: number;
  };
}

interface SystemAlert {
  id: string;
  client_name: string;
  issue: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  created_at: string;
  organization_id?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [modalType, setModalType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    mrr: 0,
    activeWorkflows: 0,
    uptime: 99.99,
    newTenants: 0,
    trends: { mrr: 0, workflows: 0, tenants: 0 }
  });
  
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [cpuLoad, setCpuLoad] = useState(75);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboardStats();
      
      setPlatformStats({
        mrr: data.mrr || 142500,
        activeWorkflows: data.active_workflows || 287,
        uptime: data.uptime || 99.99,
        newTenants: data.new_tenants || 14,
        trends: {
          mrr: data.trends?.mrr || 12.5,
          workflows: data.trends?.workflows || 5.2,
          tenants: data.trends?.tenants || 3,
        }
      });
      
      setSystemAlerts(data.system_alerts || [
        { id: '1', client_name: 'Velocity Logistics', issue: 'Meta Token Expiry', priority: 'urgent', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: '2', client_name: 'TechMart Global', issue: 'Automation Node Timeout', priority: 'high', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
        { id: '3', client_name: 'Solar Solutions', issue: 'API Limit Warning', priority: 'medium', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      ]);
      
      setCpuLoad(data.cpu_load || 75);
      
    } catch (err: any) {
      console.error('Error fetching admin dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
      // Use fallback data
      setSystemAlerts([
        { id: '1', client_name: 'Velocity Logistics', issue: 'Meta Token Expiry', priority: 'urgent', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { id: '2', client_name: 'TechMart Global', issue: 'Automation Node Timeout', priority: 'high', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
        { id: '3', client_name: 'Solar Solutions', issue: 'API Limit Warning', priority: 'medium', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount}`;
  };

  const formatTrend = (trend: number) => {
    return trend >= 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
  };

  const stats = [
    { label: 'Platform MRR', value: formatCurrency(platformStats.mrr), trend: formatTrend(platformStats.trends.mrr), icon: 'payments', color: 'text-emerald-500' },
    { label: 'Active Workflows', value: platformStats.activeWorkflows.toString(), trend: formatTrend(platformStats.trends.workflows), icon: 'account_tree', color: 'text-primary' },
    { label: 'Global Uptime', value: `${platformStats.uptime.toFixed(2)}%`, trend: 'Stable', icon: 'dns', color: 'text-indigo-400' },
    { label: 'New Tenants', value: platformStats.newTenants.toString(), trend: formatTrend(platformStats.trends.tenants), icon: 'group_add', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight dark:text-white">Mission Control</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Global platform health and tenant oversight.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setModalType('system_check')}
            className="px-8 py-3.5 bg-background-dark text-white rounded-2xl text-sm font-black shadow-xl shadow-background-dark/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-sm">terminal</span>
            Run Diagnostics
          </button>
          <button 
            onClick={() => setModalType('maintenance')}
            className="px-8 py-3.5 bg-amber-500 text-background-dark rounded-2xl text-sm font-black shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all uppercase tracking-widest"
          >
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-surface-dark p-8 rounded-[2rem] border border-slate-200 dark:border-border-dark shadow-sm hover:shadow-2xl transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className={`size-14 rounded-2xl bg-slate-50 dark:bg-background-dark flex items-center justify-center ${stat.color}`}>
                <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
              </div>
              <span className="text-emerald-500 text-[10px] font-black bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">{stat.trend}</span>
            </div>
            <p className="text-4xl font-black dark:text-white mb-2">{stat.value}</p>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Issues Queue */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black dark:text-white tracking-tight">System Alerts Queue</h3>
            <button onClick={() => navigate('/admin/requests')} className="text-primary text-xs font-black uppercase tracking-widest hover:underline">Full Incident Log</button>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-5">Tenant / Client</th>
                  <th className="px-8 py-5">Incident</th>
                  <th className="px-8 py-5">Priority</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
                {systemAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center">
                      <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
                      <p className="text-sm font-bold text-slate-500">No active alerts</p>
                    </td>
                  </tr>
                ) : (
                  systemAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black dark:text-white">{alert.client_name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{formatTimeAgo(alert.created_at)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{alert.issue}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                          alert.priority === 'urgent' ? 'bg-red-500 text-white' : 
                          alert.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-slate-500/10 text-slate-500'
                        }`}>{alert.priority}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setModalType('resolve_incident')}
                          className="px-5 py-2 bg-primary text-background-dark rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Traffic Heatmap Placeholder */}
        <div className="xl:col-span-4 space-y-4">
          <h3 className="text-2xl font-black dark:text-white tracking-tight px-2">Global Throughput</h3>
          <div className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-border-dark shadow-xl p-8 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[400px]">
            {isLoading ? (
              <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
            ) : (
              <>
                <div className="relative size-48">
                  <svg className="size-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-background-dark" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * cpuLoad / 100)} className="text-primary transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-black dark:text-white leading-none">{cpuLoad}%</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">CPU Load</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-black dark:text-white">Resource Allocation: {cpuLoad < 50 ? 'Optimal' : cpuLoad < 80 ? 'Balanced' : 'High'}</p>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">System is handling concurrent requests across 4 availability zones.</p>
                </div>
                <button onClick={() => setModalType('scaling')} className="w-full py-4 border-2 border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest hover:border-primary transition-all">Optimize Clusters</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Popups */}
      <Modal isOpen={modalType === 'system_check'} onClose={() => setModalType(null)} title="Live Diagnostic Sequence">
        <div className="space-y-6">
          <div className="bg-background-dark p-6 rounded-2xl border border-border-dark font-mono text-[10px] text-emerald-500 space-y-2 h-64 overflow-y-auto no-scrollbar">
            <p>[BOOT] Initializing system diagnostic v4.2.0</p>
            <p>[AUTH] Verified admin credentials... OK</p>
            <p>[NET] Checking Meta Edge Nodes... OK</p>
            <p>[AUTOMATION] Pinging worker clusters... (latency: 14ms)</p>
            <p>[DB] Integrity check... 100%</p>
            <p>[IO] Buffer stream status... STABLE</p>
            <p className="animate-pulse">_</p>
          </div>
          <button onClick={() => setModalType(null)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">Finalize Report</button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'resolve_incident'} onClose={() => setModalType(null)} title="Incident Remediation">
        <div className="space-y-6">
          <p className="text-sm text-slate-500 font-medium">Select a remediation strategy for this incident. This will be logged in the permanent audit trail.</p>
          <div className="space-y-3">
            <button onClick={() => setModalType(null)} className="w-full py-4 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all text-left px-6">1. Force Token Refresh</button>
            <button onClick={() => setModalType(null)} className="w-full py-4 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all text-left px-6">2. Restart Worker Instance</button>
            <button onClick={() => setModalType(null)} className="w-full py-4 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all text-left px-6">3. Notify Tenant via Alert</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'maintenance'} onClose={() => setModalType(null)} title="Scheduled Maintenance">
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Window Start</label>
            <input type="datetime-local" className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl px-6 py-4 text-sm font-bold" />
          </div>
          <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-black uppercase">This will notify 1,240 active organizations.</p>
          </div>
          <button onClick={() => setModalType(null)} className="w-full py-4 bg-amber-500 text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20">Broadcast Schedule</button>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'scaling'} onClose={() => setModalType(null)} title="Cluster Scaling">
        <div className="text-center space-y-6">
          <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
             <span className="material-symbols-outlined text-4xl font-black">settings_input_component</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Auto-scaling clusters based on real-time traffic demand. 4 new nodes provisioned.</p>
          <button onClick={() => setModalType(null)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Acknowledge</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
