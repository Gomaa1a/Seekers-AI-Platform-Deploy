
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useAuth } from '../src/context/AuthContext';
import { organizationService } from '../src/api/services/organization';

type SettingTab = 'General' | 'Security' | 'Billing' | 'Team';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface Settings {
  workspaceName: string;
  supportEmail: string;
  aiTone: string;
  twoFactorEnabled: boolean;
  lastApiRotation: string;
  autoLogoutTime: string;
  subscription: {
    plan: string;
    price: string;
    paymentLast4: string;
    paymentExpiry: string;
  };
  team: TeamMember[];
  maxSeats: number;
}

const ClientSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingTab>('General');
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<Settings>({
    workspaceName: '',
    supportEmail: '',
    aiTone: 'Professional',
    twoFactorEnabled: false,
    lastApiRotation: '14 days ago',
    autoLogoutTime: '1 Hour',
    subscription: {
      plan: 'Free',
      price: '$0.00',
      paymentLast4: '4242',
      paymentExpiry: '12/26'
    },
    team: [],
    maxSeats: 5
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await organizationService.getSettings();
      if (response.data) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Use mock/default data
      setSettings({
        workspaceName: user?.organization?.name || 'My Workspace',
        supportEmail: user?.email || 'support@example.com',
        aiTone: 'Professional',
        twoFactorEnabled: false,
        lastApiRotation: '14 days ago',
        autoLogoutTime: '1 Hour',
        subscription: {
          plan: 'Enterprise',
          price: '$199.00',
          paymentLast4: '4242',
          paymentExpiry: '12/26'
        },
        team: [
          { id: '1', name: 'Alex Thompson', email: 'alex@techmart.com', role: 'Workspace Owner', status: 'Active' },
          { id: '2', name: 'Sarah Jenkins', email: 's.jenkins@techmart.com', role: 'Editor', status: 'Active' },
          { id: '3', name: 'Mike Miller', email: 'mike@techmart.com', role: 'Viewer', status: 'Inactive' },
        ],
        maxSeats: 5
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await organizationService.updateSettings({
        name: settings.workspaceName,
        support_email: settings.supportEmail,
        ai_tone: settings.aiTone,
        auto_logout_time: settings.autoLogoutTime
      });
      setIsSuccessModal(true);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteTeamMember = async () => {
    // Would open invite modal
    alert('Invite member functionality coming soon!');
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await organizationService.removeTeamMember(memberId);
      setSettings(prev => ({
        ...prev,
        team: prev.team.filter(m => m.id !== memberId)
      }));
    } catch (err) {
      console.error('Failed to remove team member:', err);
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
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black dark:text-white tracking-tight">Workspace Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Configure your organizational DNA, security protocols, and team access.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-border-dark gap-8 overflow-x-auto no-scrollbar">
        {(['General', 'Security', 'Billing', 'Team'] as SettingTab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-400">
        {/* General Tab */}
        {activeTab === 'General' && (
          <div className="space-y-12">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
            
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Profile Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Workspace Label</label>
                  <input 
                    type="text" 
                    value={settings.workspaceName}
                    onChange={(e) => setSettings(prev => ({ ...prev, workspaceName: e.target.value }))}
                    className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all dark:text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary Support Email</label>
                  <input 
                    type="email" 
                    value={settings.supportEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                    className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all dark:text-white" 
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">AI Personalization Tone</h3>
              <div className="flex flex-wrap gap-4">
                {['Professional', 'Friendly', 'Concise', 'Detailed'].map(tone => (
                  <button 
                    key={tone} 
                    onClick={() => setSettings(prev => ({ ...prev, aiTone: tone }))}
                    className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      settings.aiTone === tone ? 'bg-primary border-primary text-background-dark shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 font-medium italic">This controls how the AI agents phrase responses across Instagram and Messenger.</p>
            </section>

            <section className="p-10 presentation-card rounded-[2.5rem] bg-red-500/5 border-red-500/10 space-y-6">
              <div className="flex items-center gap-4 text-red-500">
                <span className="material-symbols-outlined font-black">warning</span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Nuclear Option</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Permanently delete your workspace and all associated AI models, knowledge bases, and conversation history. This action is irreversible.</p>
              <button className="px-8 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-red-500/20 transition-all">Destroy Workspace</button>
            </section>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'Security' && (
          <div className="space-y-10">
            <section className="presentation-card p-10 rounded-[2.5rem] space-y-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Access Protocols</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex gap-4 items-center">
                    <span className="material-symbols-outlined text-primary">verified_user</span>
                    <div>
                      <p className="text-sm font-black dark:text-white">Two-Factor Authentication</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Status: {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      settings.twoFactorEnabled 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                        : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background-dark'
                    }`}
                  >
                    {settings.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex gap-4 items-center">
                    <span className="material-symbols-outlined text-primary">security_update_good</span>
                    <div>
                      <p className="text-sm font-black dark:text-white">API Key Rotation</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Last rotated {settings.lastApiRotation}</p>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Rotate Keys</button>
                </div>
              </div>
            </section>

            <section className="presentation-card p-10 rounded-[2.5rem] space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Session Persistence</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Auto-Logout Timer</label>
                <select 
                  value={settings.autoLogoutTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoLogoutTime: e.target.value }))}
                  className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all dark:text-white appearance-none"
                >
                  <option>15 Minutes</option>
                  <option>1 Hour</option>
                  <option>8 Hours (End of Shift)</option>
                  <option>Never</option>
                </select>
              </div>
            </section>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'Billing' && (
          <div className="space-y-10">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="presentation-card p-8 rounded-[2.5rem] border-primary/30">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Current Subscription</p>
                <h4 className="text-3xl font-black dark:text-white">{settings.subscription.plan}</h4>
                <p className="text-sm text-slate-500 font-medium mt-2">{settings.subscription.price} / Month</p>
                <button className="w-full mt-8 py-3 border border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-background-dark transition-all">Change Plan</button>
              </div>
              <div className="md:col-span-2 presentation-card p-8 rounded-[2.5rem] flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Method</p>
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <span className="material-symbols-outlined text-slate-300">credit_card</span>
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white">•••• •••• •••• {settings.subscription.paymentLast4}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Expires {settings.subscription.paymentExpiry}</p>
                    </div>
                  </div>
                </div>
                <button className="w-fit text-primary text-[10px] font-black uppercase tracking-widest hover:underline mt-6">Update Billing Method</button>
              </div>
            </section>

            <section className="presentation-card rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-white/5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Invoicing History</h3>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { date: 'Oct 01, 2023', id: 'INV-4421', amount: '$199.00', status: 'Paid' },
                  { date: 'Sep 01, 2023', id: 'INV-3982', amount: '$199.00', status: 'Paid' },
                  { date: 'Aug 01, 2023', id: 'INV-3211', amount: '$199.00', status: 'Paid' },
                ].map((inv, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="flex gap-4 items-center">
                      <div className="size-10 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">receipt_long</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{inv.date}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{inv.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-black dark:text-white">{inv.amount}</span>
                      <button className="material-symbols-outlined text-slate-500 hover:text-primary transition-colors">download</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'Team' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Team Members ({settings.team.length}/{settings.maxSeats} Seats)</h3>
              <button 
                onClick={handleInviteTeamMember}
                className="px-6 py-3 bg-primary text-background-dark rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                Invite Operator
              </button>
            </div>

            <div className="presentation-card rounded-[2.5rem] overflow-hidden">
              <div className="divide-y divide-white/5">
                {settings.team.map((member) => (
                  <div key={member.id} className="p-8 flex items-center justify-between hover:bg-white/5 transition-all group">
                    <div className="flex gap-6 items-center">
                      <div className="size-14 rounded-2xl bg-slate-500 border border-white/10 flex items-center justify-center text-white font-bold text-lg">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="text-lg font-black dark:text-white tracking-tight">{member.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{member.role}</p>
                        <p className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${member.status === 'Active' ? 'text-emerald-500' : 'text-slate-500'}`}>{member.status}</p>
                      </div>
                      {member.role !== 'Workspace Owner' && (
                        <button 
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-sm">person_remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-10 flex justify-end gap-4">
        <button className="px-8 py-4 bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Discard Changes</button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-12 py-4 bg-primary text-background-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
          Save Configuration
        </button>
      </div>

      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title="System Synchronized">
        <div className="text-center space-y-6">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
             <span className="material-symbols-outlined text-4xl font-black">sync</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black dark:text-white tracking-tight">Configuration Locked</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Workspace parameters have been updated and synchronized across the enterprise grid.</p>
          </div>
          <button onClick={() => setIsSuccessModal(false)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Acknowledge</button>
        </div>
      </Modal>
    </div>
  );
};

export default ClientSettings;
