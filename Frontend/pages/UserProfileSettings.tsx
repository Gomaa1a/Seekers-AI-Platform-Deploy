
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
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

const TIMEZONES = [
  'UTC -8 (PST)',
  'UTC -5 (EST)',
  'UTC +0 (GMT)',
  'UTC +1 (CET)',
  'UTC +2 (Cairo)',
  'UTC +3 (AST)',
  'UTC +4 (GST)',
  'UTC +8 (SGT)',
];

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
    timezone: 'UTC +2 (Cairo)',
    twoFactorEnabled: false,
    avatarUrl: '',
  });

  // 2FA enable/disable flow state
  const [twoFAModal, setTwoFAModal] = useState<'setup' | 'disable' | 'backup' | null>(null);
  const [twoFASetup, setTwoFASetup] = useState<{ qrCodeDataUrl: string; manualEntryKey: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { user: me } = await authService.getProfile();
      setProfile({
        fullName:
          [me.first_name, me.last_name].filter(Boolean).join(' ') || me.name || user?.name || '',
        email: me.email || user?.email || '',
        jobTitle: me.job_title || '',
        timezone: me.timezone || 'UTC +2 (Cairo)',
        twoFactorEnabled: Boolean(me.two_factor_enabled),
        avatarUrl: me.avatar_url || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile((prev) => ({
        ...prev,
        fullName: user?.name || prev.fullName,
        email: user?.email || prev.email,
      }));
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
        fullName: profile.fullName,
        jobTitle: profile.jobTitle,
        timezone: profile.timezone,
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err?.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEnable2FA = async () => {
    setTwoFAError(null);
    setTwoFACode('');
    try {
      setTwoFABusy(true);
      const setup = await authService.setup2FA();
      setTwoFASetup(setup);
      setTwoFAModal('setup');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start 2FA setup.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirmEnable2FA = async () => {
    if (!twoFACode.trim()) return;
    try {
      setTwoFABusy(true);
      setTwoFAError(null);
      const result = await authService.enable2FA(twoFACode.trim());
      setProfile((prev) => ({ ...prev, twoFactorEnabled: true }));
      setBackupCodes(result?.backupCodes || []);
      setTwoFAModal('backup');
    } catch (err: any) {
      setTwoFAError(err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirmDisable2FA = async () => {
    if (!twoFACode.trim()) return;
    try {
      setTwoFABusy(true);
      setTwoFAError(null);
      await authService.disable2FA(twoFACode.trim());
      setProfile((prev) => ({ ...prev, twoFactorEnabled: false }));
      setTwoFAModal(null);
    } catch (err: any) {
      setTwoFAError(err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const closeTwoFAModal = () => {
    setTwoFAModal(null);
    setTwoFASetup(null);
    setTwoFACode('');
    setTwoFAError(null);
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
              {!TIMEZONES.includes(profile.timezone) && (
                <option value={profile.timezone}>{profile.timezone}</option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
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
                {profile.twoFactorEnabled ? 'Enabled - Your account is protected' : 'Disabled - Enhance your account security with an authenticator app'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (profile.twoFactorEnabled) {
                setTwoFACode('');
                setTwoFAError(null);
                setTwoFAModal('disable');
              } else {
                startEnable2FA();
              }
            }}
            disabled={twoFABusy}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 ${
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

      {/* 2FA setup: scan QR then confirm with a code */}
      <Modal isOpen={twoFAModal === 'setup'} onClose={closeTwoFAModal} title="Enable Two-Factor Auth">
        <div className="space-y-6 text-center">
          {twoFASetup?.qrCodeDataUrl && (
            <img src={twoFASetup.qrCodeDataUrl} alt="2FA QR code" className="size-44 mx-auto rounded-xl border border-slate-200 dark:border-border-dark bg-white p-2" />
          )}
          <p className="text-xs text-slate-500 font-medium">
            Scan with Google Authenticator (or any TOTP app), then enter the 6-digit code.
            Manual key: <code className="text-[10px] break-all">{twoFASetup?.manualEntryKey}</code>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            placeholder="123456"
            className="w-40 mx-auto text-center tracking-[0.5em] font-black bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-lg"
          />
          {twoFAError && <p className="text-xs text-red-500">{twoFAError}</p>}
          <button
            onClick={confirmEnable2FA}
            disabled={twoFABusy || twoFACode.trim().length < 6}
            className="w-full py-3 bg-primary text-background-dark rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {twoFABusy ? 'Verifying…' : 'Verify & Enable'}
          </button>
        </div>
      </Modal>

      {/* 2FA backup codes after enabling */}
      <Modal isOpen={twoFAModal === 'backup'} onClose={closeTwoFAModal} title="Save Your Backup Codes">
        <div className="space-y-6">
          <p className="text-xs text-slate-500 font-medium">
            Store these one-time backup codes somewhere safe. Each can be used once if you lose
            access to your authenticator app.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <code key={code} className="text-xs font-bold text-center bg-slate-50 dark:bg-background-dark rounded-lg py-2 dark:text-white">{code}</code>
            ))}
          </div>
          <button
            onClick={closeTwoFAModal}
            className="w-full py-3 bg-primary text-background-dark rounded-xl text-xs font-black uppercase tracking-widest"
          >
            I saved them
          </button>
        </div>
      </Modal>

      {/* 2FA disable: confirm with a current code */}
      <Modal isOpen={twoFAModal === 'disable'} onClose={closeTwoFAModal} title="Disable Two-Factor Auth">
        <div className="space-y-6 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Enter a current code from your authenticator app to confirm disabling 2FA.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            placeholder="123456"
            className="w-40 mx-auto text-center tracking-[0.5em] font-black bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-lg"
          />
          {twoFAError && <p className="text-xs text-red-500">{twoFAError}</p>}
          <button
            onClick={confirmDisable2FA}
            disabled={twoFABusy || twoFACode.trim().length < 6}
            className="w-full py-3 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {twoFABusy ? 'Verifying…' : 'Disable 2FA'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfileSettings;
