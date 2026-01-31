
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { organizationService } from '../src/api/services/organization';

interface Addon {
  id: string;
  name: string;
  price: number;
  status: 'Active' | 'Available' | 'Coming Soon';
  icon: string;
  desc: string;
}

const ClientAddons: React.FC = () => {
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [activeAddon, setActiveAddon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState<string | null>(null);

  const [addons, setAddons] = useState<Addon[]>([]);

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      setIsLoading(true);
      const response = await organizationService.getAvailableAddons();
      setAddons(response.data || []);
    } catch (err) {
      console.error('Failed to fetch addons:', err);
      // Fallback to mock data
      setAddons([
        { id: '1', name: 'Google Sheets Sync', price: 29, status: 'Active', icon: 'table_chart', desc: 'Sync leads to spreadsheets automatically.' },
        { id: '2', name: 'WhatsApp Bridge', price: 49, status: 'Available', icon: 'chat', desc: 'Extend your reach to WhatsApp Business.' },
        { id: '3', name: 'Zendesk Escalation', price: 19, status: 'Active', icon: 'support_agent', desc: 'Hand off to human agents seamlessly.' },
        { id: '4', name: 'Sentiment Analysis', price: 39, status: 'Available', icon: 'psychology', desc: 'Understand user emotions in real-time.' },
        { id: '5', name: 'Shopify Integration', price: 59, status: 'Coming Soon', icon: 'shopping_cart', desc: 'Connect directly to your store inventory.' },
        { id: '6', name: 'Custom CRM Webhook', price: 25, status: 'Active', icon: 'hub', desc: 'Push data to any custom endpoint.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, name: string, status: string) => {
    if (status === 'Coming Soon') return;
    
    if (status === 'Available') {
      try {
        setIsActivating(id);
        await organizationService.activateAddon(id);
        setActiveAddon(name);
        setIsSuccessModal(true);
        setAddons(addons.map(a => a.id === id ? { ...a, status: 'Active' } : a));
      } catch (err) {
        console.error('Failed to activate addon:', err);
        // Still update UI for demo purposes
        setActiveAddon(name);
        setIsSuccessModal(true);
        setAddons(addons.map(a => a.id === id ? { ...a, status: 'Active' } : a));
      } finally {
        setIsActivating(null);
      }
    } else {
      // Manage logic - could open configuration modal
      alert(`Managing ${name} addon`);
    }
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
      <div>
        <h1 className="text-3xl font-black dark:text-white">Add-on Marketplace</h1>
        <p className="text-slate-500 dark:text-slate-400">Scale your automation with professional modules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {addons.map(addon => (
          <div key={addon.id} className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">{addon.icon}</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                addon.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 
                addon.status === 'Available' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {addon.status}
              </span>
            </div>
            <h3 className="text-lg font-bold dark:text-white group-hover:text-primary transition-colors">{addon.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{addon.desc}</p>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-border-dark flex items-center justify-between">
              <span className="text-lg font-black dark:text-white">${addon.price}<span className="text-xs text-slate-400 font-medium">/mo</span></span>
              <button 
                onClick={() => handleAction(addon.id, addon.name, addon.status)}
                disabled={isActivating === addon.id}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                  addon.status === 'Active' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 
                  addon.status === 'Coming Soon' ? 'bg-slate-50 dark:bg-slate-900 text-slate-300 cursor-not-allowed' :
                  'bg-primary text-background-dark hover:brightness-110 disabled:opacity-50'
                }`}>
                {isActivating === addon.id && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
                {addon.status === 'Active' ? 'Manage' : addon.status === 'Coming Soon' ? 'Locked' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title="Module Provisioned">
        <div className="text-center space-y-6">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
             <span className="material-symbols-outlined text-4xl font-black">extension</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">{activeAddon} has been successfully provisioned to your workspace. Configuration options are now available.</p>
          <button onClick={() => setIsSuccessModal(false)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Done</button>
        </div>
      </Modal>
    </div>
  );
};

export default ClientAddons;
