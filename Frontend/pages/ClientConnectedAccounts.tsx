
import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { metaService } from '../src/api';
import { MetaConnection, MetaPage } from '../src/types';

interface ConnectedAccount {
  id: string;
  name: string;
  type: string;
  status: 'Connected' | 'Needs Re-auth' | 'Disconnected';
  icon: string;
  brand: 'Facebook' | 'Instagram' | 'Messenger';
  pageId?: string;
}

const ClientConnectedAccounts: React.FC = () => {
  const [isConnectModal, setIsConnectModal] = useState(false);
  const [activeAccount, setActiveAccount] = useState<ConnectedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await metaService.getConnectionStatus();
      
      if (status.connected && status.connection) {
        setMetaConnection(status.connection);
        
        // Build accounts list from pages
        const connectedAccounts: ConnectedAccount[] = [];
        
        if (status.pages && status.pages.length > 0) {
          status.pages.forEach((page: MetaPage) => {
            connectedAccounts.push({
              id: page.id,
              name: page.name,
              type: 'Facebook Page',
              status: page.is_active ? 'Connected' : 'Needs Re-auth',
              icon: 'facebook',
              brand: 'Facebook',
              pageId: page.page_id,
            });
            
            // Add Instagram if connected
            if (page.instagram_account_id) {
              connectedAccounts.push({
                id: `ig-${page.id}`,
                name: `@${page.name.toLowerCase().replace(/\s/g, '_')}`,
                type: 'Instagram Business',
                status: page.is_active ? 'Connected' : 'Needs Re-auth',
                icon: 'photo_camera',
                brand: 'Instagram',
                pageId: page.page_id,
              });
            }
          });
        }
        
        setAccounts(connectedAccounts);
      } else {
        setMetaConnection(null);
        setAccounts([]);
      }
    } catch (err: any) {
      console.error('Error fetching connection status:', err);
      setError(err.response?.data?.error || 'Failed to load connected accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectMeta = async () => {
    setIsConnecting(true);
    try {
      const { url } = await metaService.getOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeAccount?.pageId) return;
    
    setIsDisconnecting(true);
    try {
      await metaService.disconnectPage(activeAccount.pageId);
      setAccounts(prev => prev.filter(a => a.pageId !== activeAccount.pageId));
      setIsConnectModal(false);
      setActiveAccount(null);
      // Refetch to update status
      fetchConnectionStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSettings = (account: ConnectedAccount) => {
    setActiveAccount(account);
    setIsConnectModal(true);
  };

  const getPlatformBrandColor = (brand: string) => {
    switch(brand) {
      case 'Facebook': return 'bg-[#1877F2]';
      case 'Instagram': return 'bg-gradient-to-tr from-[#f09433] to-[#bc1888]';
      case 'Messenger': return 'bg-[#00B2FF]';
      default: return 'bg-primary';
    }
  };

  const getPlatformTextColor = (brand: string) => {
    switch(brand) {
      case 'Facebook': return 'text-[#1877F2]';
      case 'Instagram': return 'text-[#bc1888]';
      case 'Messenger': return 'text-[#00B2FF]';
      default: return 'text-primary';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white">Connected Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your Meta Business integrations.</p>
        </div>
        <button 
          onClick={() => { setActiveAccount(null); setIsConnectModal(true); }}
          disabled={isConnecting}
          className="px-6 py-3 bg-[#1877F2] text-white rounded-xl text-sm font-black flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
          {isConnecting ? (
            <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">add</span>
          )}
          Connect via Meta
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-16 text-center">
          <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-400">link_off</span>
          </div>
          <h3 className="text-xl font-black dark:text-white mb-2">No Connected Accounts</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Connect your Meta Business accounts to enable automation.</p>
          <button 
            onClick={handleConnectMeta}
            disabled={isConnecting}
            className="px-8 py-4 bg-[#1877F2] text-white rounded-xl text-sm font-black flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-blue-500/20 mx-auto disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                Connecting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">link</span>
                Connect Facebook & Instagram
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-border-dark">
            {accounts.map(acc => (
              <div key={acc.id} className="p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
                <div className="flex items-center gap-6">
                  <div className={`size-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/10 group-hover:scale-105 transition-transform ${getPlatformBrandColor(acc.brand)}`}>
                    <span className="material-symbols-outlined text-2xl font-black">{acc.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-black text-xl dark:text-white leading-none tracking-tight">{acc.name}</h3>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${getPlatformTextColor(acc.brand)} border-current bg-current/5`}>
                        {acc.brand}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{acc.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                    acc.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse'
                  }`}>
                    {acc.status}
                  </span>
                  <button onClick={() => handleSettings(acc)} className="size-12 rounded-2xl bg-slate-50 dark:bg-background-dark text-slate-400 hover:text-primary transition-all flex items-center justify-center border border-slate-200 dark:border-border-dark">
                    <span className="material-symbols-outlined">settings</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isConnectModal} onClose={() => {setIsConnectModal(false); setActiveAccount(null);}} title={activeAccount ? `Manage ${activeAccount.name}` : "Connect Account"}>
        <div className="space-y-6">
          <p className="text-sm text-slate-500 font-medium">
            {activeAccount 
              ? `Manage settings for your ${activeAccount.brand} account.`
              : 'Link your professional Facebook Pages and Instagram Business accounts to authorize Seekers AI automation.'
            }
          </p>
          <div className="space-y-3">
             {!activeAccount && (
               <button 
                 onClick={handleConnectMeta} 
                 disabled={isConnecting}
                 className="w-full py-5 bg-[#1877F2] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-50"
               >
                 {isConnecting ? (
                   <>
                     <span className="animate-spin material-symbols-outlined font-black">progress_activity</span>
                     Connecting...
                   </>
                 ) : (
                   <>
                     <span className="material-symbols-outlined font-black">link</span> 
                     OAuth via Meta
                   </>
                 )}
               </button>
             )}
             {activeAccount && (
               <>
                 {activeAccount.status === 'Needs Re-auth' && (
                   <button 
                     onClick={handleConnectMeta}
                     disabled={isConnecting}
                     className="w-full py-4 bg-[#1877F2] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                   >
                     Re-authorize Account
                   </button>
                 )}
                 <button 
                   onClick={handleDisconnect} 
                   disabled={isDisconnecting}
                   className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                 >
                   {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                 </button>
               </>
             )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientConnectedAccounts;
