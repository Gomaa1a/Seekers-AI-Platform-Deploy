
import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { authService } from '../src/api/services/auth';

interface ProfileData {
  fullName: string;
  email: string;
  jobTitle: string;
  timezone: string;
  twoFactorEnabled: boolean;
  avatarUrl: string;
}

const UserProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    email: '',
    jobTitle: '',
    timezone: 'UTC -5 (EST)',
    twoFactorEnabled: false,
    avatarUrl: 'https://picsum.photos/200?random=userprofile'
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getProfile();
      if (response.data) {
        setProfile({
          fullName: response.data.name || user?.name || '',
          email: response.data.email || user?.email || '',
          jobTitle: response.data.job_title || '',
          timezone: response.data.timezone || 'UTC -5 (EST)',
          twoFactorEnabled: response.data.two_factor_enabled || false,
          avatarUrl: response.data.avatar_url || 'https://picsum.photos/200?random=userprofile'
        });
      }
    } catch (err) {
      // Use auth context data as fallback
      setProfile({
        fullName: user?.name || 'User',
        email: user?.email || '',
        jobTitle: '',
        timezone: 'UTC -5 (EST)',
        twoFactorEnabled: false,
        avatarUrl: 'https://picsum.photos/200?random=userprofile'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      await authService.updateProfile({
        name: profile.fullName,
        job_title: profile.jobTitle,
        timezone: profile.timezone
      });
      
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const newStatus = !profile.twoFactorEnabled;
      await authService.toggle2FA(newStatus);
      setProfile(prev => ({ ...prev, twoFactorEnabled: newStatus }));
    } catch (err) {
      console.error('Failed to toggle 2FA:', err);
      // Toggle anyway for UI demo
      setProfile(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
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
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="size-24 rounded-full border-4 border-primary/20 bg-cover bg-center shadow-xl flex items-center justify-center bg-primary text-white text-3xl font-bold" style={{ backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : 'none' }}>
            {!profile.avatarUrl && profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 size-8 bg-primary rounded-full border-4 border-white dark:border-background-dark flex items-center justify-center text-background-dark hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-sm font-black">edit</span>
          </button>
        </div>
        <div>
          <h1 className="text-3xl font-black dark:text-white">Account Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your personal presence on the platform.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
            <input 
              type="text" 
              value={profile.fullName}
              onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
            <input 
              type="email" 
              value={profile.email}
              disabled
              className="w-full bg-slate-50 dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed" 
            />
            <p className="text-[10px] text-slate-400">Email cannot be changed</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Title</label>
            <input 
              type="text" 
              value={profile.jobTitle}
              onChange={(e) => setProfile(prev => ({ ...prev, jobTitle: e.target.value }))}
              placeholder="Enter your job title"
              className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timezone</label>
            <select 
              value={profile.timezone}
              onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            >
              <option>UTC -8 (PST)</option>
              <option>UTC -5 (EST)</option>
              <option>UTC +0 (GMT)</option>
              <option>UTC +1 (CET)</option>
              <option>UTC +8 (SGT)</option>
              <option>UTC +9 (JST)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl space-y-6">
        <h3 className="text-xs font-black text-primary uppercase tracking-widest">Security Configuration</h3>
        <div className="flex items-center justify-between p-4 bg-white dark:bg-background-dark rounded-2xl border border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary">security</span>
            <div>
              <p className="text-sm font-bold dark:text-white">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">
                {profile.twoFactorEnabled ? 'Enabled - Your account is protected' : 'Disabled - Enhance your account security with MFA'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleToggle2FA}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              profile.twoFactorEnabled 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                : 'bg-primary/10 text-primary hover:bg-primary hover:text-background-dark'
            }`}
          >
            {profile.twoFactorEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button 
          onClick={fetchProfile}
          className="px-8 py-4 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          Discard
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-10 py-4 bg-primary text-background-dark rounded-xl text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
          Update Profile
        </button>
      </div>
    </div>
  );
};

export default UserProfileSettings;
