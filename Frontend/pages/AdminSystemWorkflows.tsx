
import React, { useState, useEffect } from 'react';
import { adminService } from '../src/api/services/admin';
import { N8nWorkflow } from '../src/types';

const AdminSystemWorkflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getN8nWorkflows();
      setWorkflows(response.data || []);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError('Failed to load workflows');
      // Fallback to mock data for development
      setWorkflows([
        { id: '1', name: 'Base FB Auto-Reply', type: 'meta', description: 'Meta platform auto-reply', n8n_workflow_id: 'w-001', webhook_url: 'https://n8n.seekers.ai/webhook/fb-reply', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', status: 'golden', deployment_count: 450, success_rate: 100 },
        { id: '2', name: 'IG Comment-to-DM', type: 'engagement', description: 'Convert comments to DMs', n8n_workflow_id: 'w-002', webhook_url: 'https://n8n.seekers.ai/webhook/ig-dm', is_active: true, created_at: '2024-01-10', updated_at: '2024-01-10', status: 'stable', deployment_count: 124, success_rate: 98.2 },
        { id: '3', name: 'Support Multi-Bridge', type: 'support', description: 'Multi-channel support routing', n8n_workflow_id: 'w-003', webhook_url: 'https://n8n.seekers.ai/webhook/support', is_active: true, created_at: '2024-01-05', updated_at: '2024-01-05', status: 'beta', deployment_count: 12, success_rate: 85.4 },
        { id: '4', name: 'Data Sink Utility', type: 'utility', description: 'Data aggregation utility', n8n_workflow_id: 'w-004', webhook_url: 'https://n8n.seekers.ai/webhook/data', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01', status: 'golden', deployment_count: 890, success_rate: 100 },
      ] as any);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'golden': return 'bg-amber-500/10 text-amber-500';
      case 'stable': return 'bg-emerald-500/10 text-emerald-500';
      case 'beta': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
    }
  };

  const getTypeLabel = (type: string) => {
    return type?.charAt(0).toUpperCase() + type?.slice(1) || 'General';
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || (w as any).type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get unique types for filter
  const workflowTypes = [...new Set(workflows.map(w => (w as any).type).filter(Boolean))];

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
          <h1 className="text-3xl font-black dark:text-white">Master Automation Library</h1>
          <p className="text-slate-500 dark:text-slate-400">Master templates used for automated fulfillment across the platform.</p>
        </div>
        <button className="px-6 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-sm font-black flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
          Import Automation JSON
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm font-bold"
        >
          <option value="all">All Types</option>
          {workflowTypes.map(type => (
            <option key={type} value={type}>{getTypeLabel(type)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredWorkflows.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">account_tree</span>
            <p>No workflows found.</p>
          </div>
        ) : (
          filteredWorkflows.map(t => (
            <div key={t.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm flex flex-col group hover:border-primary/50 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                     <span className="material-symbols-outlined">account_tree</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${getStatusStyle((t as any).status)}`}>
                    {(t as any).status || 'Active'}
                  </span>
               </div>
               <h3 className="font-bold dark:text-white group-hover:text-primary transition-colors">{t.name}</h3>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{getTypeLabel((t as any).type)} Template</p>
               
               <div className="mt-8 space-y-4 pt-6 border-t border-slate-50 dark:border-border-dark flex-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-400">Deployments</span>
                    <span className="dark:text-white">{(t as any).deployment_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-400">Success Rate</span>
                    <span className="text-emerald-500">{(t as any).success_rate || 100}%</span>
                  </div>
               </div>
               <button className="mt-6 w-full py-2.5 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary transition-all">
                 Edit Node Logic
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminSystemWorkflows;
