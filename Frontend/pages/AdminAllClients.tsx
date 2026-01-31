
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { adminService } from '../src/api/services/admin';

interface Client {
  id: string;
  name: string;
  email: string;
  organization: {
    id: string;
    name: string;
    plan: string;
    status: string;
    created_at: string;
  };
  usage_percent?: number;
  mrr?: number;
}

const AdminAllClients: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form state for new client
  const [newClient, setNewClient] = useState({
    organizationName: '',
    adminEmail: '',
    plan: 'free_trial'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getAllClients();
      setClients(response.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients');
      // Fallback to mock data for development
      setClients([
        { id: '1', name: 'John Smith', email: 'john@techmart.com', organization: { id: '1', name: 'TechMart Global', plan: 'enterprise', status: 'active', created_at: '2023-10-15' }, usage_percent: 85, mrr: 1200 },
        { id: '2', name: 'Sarah Johnson', email: 'sarah@velocity.com', organization: { id: '2', name: 'Velocity Logistics', plan: 'pro', status: 'active', created_at: '2023-09-20' }, usage_percent: 42, mrr: 450 },
        { id: '3', name: 'Mike Chen', email: 'mike@solar.com', organization: { id: '3', name: 'Solar Solutions', plan: 'free_trial', status: 'trial', created_at: '2023-11-01' }, usage_percent: 12, mrr: 0 },
        { id: '4', name: 'Emma Davis', email: 'emma@infinite.com', organization: { id: '4', name: 'Infinite Threads', plan: 'enterprise', status: 'suspended', created_at: '2023-08-10' }, usage_percent: 0, mrr: 0 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.organizationName || !newClient.adminEmail) return;

    try {
      setIsSubmitting(true);
      await adminService.createClient({
        organization_name: newClient.organizationName,
        admin_email: newClient.adminEmail,
        plan: newClient.plan
      });
      setIsAddModalOpen(false);
      setNewClient({ organizationName: '', adminEmail: '', plan: 'free_trial' });
      fetchClients();
    } catch (err) {
      console.error('Failed to create client:', err);
      setError('Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const getPlanStyle = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'enterprise': return 'bg-purple-500/10 text-purple-500';
      case 'pro': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.organization.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-3xl font-black dark:text-white">Tenant Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Overview of all organizations on the Seekers AI platform.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-primary text-background-dark rounded-xl text-sm font-black hover:scale-[1.02] transition-all">+ Add New Client</button>
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
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm font-bold"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-background-dark/50 border-b border-slate-200 dark:border-border-dark">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-5">Client Name</th>
              <th className="px-6 py-5">Plan</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Resource Usage</th>
              <th className="px-6 py-5">MRR</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-border-dark">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  No clients found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredClients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer">
                  <td className="px-6 py-6">
                    <p className="font-bold dark:text-white">{c.organization.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Joined {formatDate(c.organization.created_at)}</p>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${getPlanStyle(c.organization.plan)}`}>
                      {c.organization.plan?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`size-2 inline-block rounded-full mr-2 ${getStatusColor(c.organization.status)}`}></span>
                    <span className="text-xs font-bold dark:text-slate-300 capitalize">{c.organization.status}</span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${c.usage_percent || 0}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black dark:text-white">{c.usage_percent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-black dark:text-white">{formatCurrency(c.mrr || 0)}</td>
                  <td className="px-6 py-6 text-right">
                    <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Onboard New Tenant">
        <form onSubmit={handleCreateClient} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Name</label>
              <input 
                type="text" 
                value={newClient.organizationName}
                onChange={(e) => setNewClient(prev => ({ ...prev, organizationName: e.target.value }))}
                placeholder="Global Corp Ltd." 
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Email</label>
              <input 
                type="email" 
                value={newClient.adminEmail}
                onChange={(e) => setNewClient(prev => ({ ...prev, adminEmail: e.target.value }))}
                placeholder="admin@globalcorp.com" 
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provision Plan</label>
              <select 
                value={newClient.plan}
                onChange={(e) => setNewClient(prev => ({ ...prev, plan: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm"
              >
                 <option value="free_trial">Free Trial</option>
                 <option value="pro">Pro</option>
                 <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isSubmitting || !newClient.organizationName || !newClient.adminEmail}
            className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
            Submit Onboarding
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAllClients;
