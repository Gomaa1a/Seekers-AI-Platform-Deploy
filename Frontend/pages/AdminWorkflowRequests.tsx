
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../src/api';
import { WorkflowRequest } from '../src/types';

interface RequestStats {
  unassigned: number;
  inProgress: number;
  reviewing: number;
  completed24h: number;
}

const AdminWorkflowRequests: React.FC = () => {
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RequestStats>({
    unassigned: 0,
    inProgress: 0,
    reviewing: 0,
    completed24h: 0,
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getPendingWorkflowRequests();
      const data = response.data || response;
      setRequests(data);
      
      // Calculate stats
      const statsData: RequestStats = {
        unassigned: data.filter((r: WorkflowRequest) => r.status === 'pending').length,
        inProgress: data.filter((r: WorkflowRequest) => r.status === 'in_progress').length,
        reviewing: data.filter((r: WorkflowRequest) => r.status === 'reviewing').length,
        completed24h: data.filter((r: WorkflowRequest) => {
          if (r.status !== 'completed') return false;
          const completedAt = new Date(r.updated_at || r.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return completedAt > dayAgo;
        }).length,
      };
      setStats(statsData);
      
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.error || 'Failed to load requests');
      // Use fallback data
      setRequests([
        { id: 'REQ-123', organization_id: '1', title: 'Order Refund Bot', description: '', request_type: 'chatbot', status: 'pending', priority: 'high', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), organization: { name: 'Global Retail Corp' } } as any,
        { id: 'REQ-124', organization_id: '2', title: 'Tracking Integration', description: '', request_type: 'chatbot', status: 'reviewing', priority: 'normal', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), organization: { name: 'Velocity Logistics' } } as any,
        { id: 'REQ-125', organization_id: '3', title: 'Inventory Lookup', description: '', request_type: 'chatbot', status: 'in_progress', priority: 'high', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), organization: { name: 'TechMart Global' } } as any,
      ]);
      setStats({ unassigned: 5, inProgress: 12, reviewing: 3, completed24h: 24 });
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

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'normal': return 'bg-slate-100 dark:bg-slate-700 text-slate-500';
      case 'low': return 'bg-slate-100 dark:bg-slate-700 text-slate-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'New';
      case 'reviewing': return 'Reviewing';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black dark:text-white">Automation Queue</h1>
        <p className="text-slate-500 dark:text-slate-400">Incoming workflow requests requiring fulfillment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Unassigned', val: stats.unassigned.toString(), color: 'bg-red-500' },
          { label: 'In Progress', val: stats.inProgress.toString(), color: 'bg-primary' },
          { label: 'Reviewing', val: stats.reviewing.toString(), color: 'bg-amber-500' },
          { label: 'Completed (24h)', val: stats.completed24h.toString(), color: 'bg-emerald-500' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
             <div className="flex items-center gap-3">
                <span className={`size-2 rounded-full ${s.color}`}></span>
                <span className="text-2xl font-black dark:text-white">{s.val}</span>
             </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button onClick={fetchRequests} className="mt-4 text-primary font-bold hover:underline">Try Again</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
             <thead className="bg-slate-50 dark:bg-background-dark/50 border-b border-slate-200 dark:border-border-dark">
               <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5">Client / Request</th>
                  <th className="px-6 py-5 text-center">Priority</th>
                  <th className="px-6 py-5">Wait Time</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
               {requests.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center">
                     <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                     <p className="text-sm text-slate-400 font-medium">No pending requests</p>
                   </td>
                 </tr>
               ) : (
                 requests.map(r => (
                   <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-6 py-6">
                         <p className="font-bold dark:text-white">{r.title}</p>
                         <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                           {(r as any).organization?.name || 'Unknown'} • {r.id.slice(0, 8).toUpperCase()}
                         </p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${getPriorityStyle(r.priority)}`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-xs font-bold text-slate-500">{formatTimeAgo(r.created_at)}</td>
                      <td className="px-6 py-6">
                        <span className="text-xs font-black text-primary uppercase">{getStatusLabel(r.status)}</span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Link to={`/admin/fulfill/${r.id}`} className="px-4 py-2 bg-primary text-background-dark rounded-xl text-[10px] font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-primary/20">
                          Manage
                        </Link>
                      </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminWorkflowRequests;
