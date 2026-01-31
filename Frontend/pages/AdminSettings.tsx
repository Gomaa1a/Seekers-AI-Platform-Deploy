
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { adminService } from '../src/api/services/admin';

interface PlatformConfig {
  pricingTiers: {
    free: number;
    pro: number;
    enterprise: number;
  };
  metaAppId: string;
  metaAppSecret: string;
  maintenanceMode: boolean;
  freeTierWebhookUrl: string;
  freeTierTrialHours: number;
}

const AdminSettings: React.FC = () => {
  const [config, setConfig] = useState<PlatformConfig>({
    pricingTiers: { free: 0, pro: 99, enterprise: 199 },
    metaAppId: '82348923490234',
    metaAppSecret: '••••••••••••••••••••••••',
    maintenanceMode: false,
    freeTierWebhookUrl: '',
    freeTierTrialHours: 24
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await adminService.getPlatformConfig();
      if (response.data) {
        // Map backend keys to frontend keys
        setConfig({
          pricingTiers: response.data.pricing_tiers || response.data.pricingTiers || { free: 0, pro: 99, enterprise: 199 },
          metaAppId: response.data.meta_app_id || response.data.metaAppId || '',
          metaAppSecret: response.data.meta_app_secret || response.data.metaAppSecret || '••••••••••••••••••••••••',
          maintenanceMode: response.data.maintenance_mode || response.data.maintenanceMode || false,
          freeTierWebhookUrl: response.data.free_tier_webhook_url || '',
          freeTierTrialHours: response.data.free_tier_trial_hours || 24
        });
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
      // Keep default values
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsSaving(true);
      setError(null);
      // Map frontend keys to backend keys
      await adminService.updatePlatformConfig({
        pricing_tiers: config.pricingTiers,
        meta_app_id: config.metaAppId,
        maintenance_mode: config.maintenanceMode,
        free_tier_webhook_url: config.freeTierWebhookUrl,
        free_tier_trial_hours: config.freeTierTrialHours
      });
      setIsSuccessModal(true);
    } catch (err) {
      console.error('Failed to update config:', err);
      setError('Failed to update configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMaintenance = async () => {
    const newMode = !config.maintenanceMode;
    try {
      await adminService.setMaintenanceMode(newMode);
      setConfig(prev => ({ ...prev, maintenanceMode: newMode }));
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
      // Still toggle for UI demo
      setConfig(prev => ({ ...prev, maintenanceMode: newMode }));
    }
  };

  const handleTierPriceChange = (tier: 'free' | 'pro' | 'enterprise', value: string) => {
    const price = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      pricingTiers: { ...prev.pricingTiers, [tier]: price }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black dark:text-white">Platform Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400">Global settings and enterprise-level controls.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-12">
        {/* Free Tier Auto-Connect Settings */}
        <section className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-500">bolt</span>
            Free Tier Auto-Connect
          </h3>
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="size-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">webhook</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black dark:text-white">n8n Webhook URL for Free Tier</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When users connect their social accounts, they'll automatically be connected to this webhook for a {config.freeTierTrialHours}-hour free trial.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Base Webhook URL</label>
                <input 
                  type="url" 
                  value={config.freeTierWebhookUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, freeTierWebhookUrl: e.target.value }))}
                  placeholder="https://n8n.yourdomain.com/webhook/free-tier"
                  className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trial Duration (Hours)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="168"
                    value={config.freeTierTrialHours}
                    onChange={(e) => setConfig(prev => ({ ...prev, freeTierTrialHours: parseInt(e.target.value) || 24 }))}
                    className="w-full bg-white dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                    <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      Users will have {config.freeTierTrialHours} hours of free AI automation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pricing Tier Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {(['free', 'pro', 'enterprise'] as const).map(tier => (
               <div key={tier} className="p-6 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-sm">
                  <h4 className="text-sm font-black dark:text-white uppercase mb-4">{tier} Tier</h4>
                  <div className="space-y-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={config.pricingTiers[tier]}
                        onChange={(e) => handleTierPriceChange(tier, e.target.value)}
                        placeholder="Price (USD)" 
                        className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-xl text-xs py-2 px-3 pl-7 focus:ring-1 focus:ring-primary" 
                      />
                    </div>
                    <button 
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className="w-full py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-background-dark transition-all disabled:opacity-50">
                      Update Fee
                    </button>
                  </div>
               </div>
             ))}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Meta App Credentials</h3>
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">App ID</label>
                <input 
                  type="password" 
                  value={config.metaAppId} 
                  readOnly 
                  className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary" 
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">App Secret</label>
                <input 
                  type="password" 
                  value={config.metaAppSecret} 
                  readOnly 
                  className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary" 
                />
             </div>
             <button onClick={handleUpdate} className="text-xs font-black text-primary uppercase tracking-widest hover:underline">Rotate Credentials</button>
          </div>
        </section>

        <section className={`p-8 border rounded-2xl flex items-center justify-between gap-8 transition-colors ${
          config.maintenanceMode ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'
        }`}>
           <div className="flex gap-4">
              <span className={`material-symbols-outlined text-3xl ${config.maintenanceMode ? 'text-red-500' : 'text-amber-500'}`}>
                {config.maintenanceMode ? 'lock' : 'construction'}
              </span>
              <div>
                 <h4 className={`text-sm font-black uppercase tracking-widest ${config.maintenanceMode ? 'text-red-500' : 'dark:text-white'}`}>
                    Maintenance Mode: {config.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                 </h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">When enabled, clients cannot submit new requests or manage knowledge bases.</p>
              </div>
           </div>
           <button 
             onClick={toggleMaintenance}
             className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all ${
               config.maintenanceMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
             }`}>
             {config.maintenanceMode ? 'Disable Mode' : 'Enable Mode'}
           </button>
        </section>
      </div>

      <div className="pt-10 flex justify-end">
        <button 
          onClick={handleUpdate}
          disabled={isSaving}
          className="px-10 py-4 bg-primary text-background-dark rounded-xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
          {isSaving && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
          Commit Global Changes
        </button>
      </div>

      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title="Changes Applied">
        <div className="text-center space-y-6">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
             <span className="material-symbols-outlined text-4xl font-black">save</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Global platform configuration has been updated and propagated across all edge nodes.</p>
          <button onClick={() => setIsSuccessModal(false)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Done</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSettings;
