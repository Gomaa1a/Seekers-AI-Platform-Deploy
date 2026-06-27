import React, { useState, useEffect } from 'react';
import { metaService } from '../src/api';

interface ConnectedPage {
  id: string;        // internal UUID
  pageId: string;    // Facebook page id
  name: string;
  isActive: boolean;
  pictureUrl?: string;
}

interface ConnectedIg {
  id: string;        // internal UUID
  instagramId: string;
  username: string;
  isActive: boolean;
  profilePictureUrl?: string;
}

const ClientConnectedAccounts: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [metaConnected, setMetaConnected] = useState(false);
  const [connectedPages, setConnectedPages] = useState<ConnectedPage[]>([]);
  const [connectedIg, setConnectedIg] = useState<ConnectedIg[]>([]);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [availableIg, setAvailableIg] = useState<any[]>([]);

  useEffect(() => {
    // Surface the OAuth result from the redirect URL
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      if (search.includes('success=true')) setNotice('Meta account connected. Now choose a Page to connect below.');
      const errMatch = search.match(/[?&]error=([^&#]+)/);
      if (errMatch) setError(decodeURIComponent(errMatch[1]));
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await metaService.getConnectionStatus();
      const connected = !!status.connected;
      setMetaConnected(connected);
      setConnectedPages((status.platforms?.facebook?.pages as ConnectedPage[]) || []);
      setConnectedIg((status.platforms?.instagram?.pages as ConnectedIg[]) || []);

      if (connected) {
        // Fetch pages/IG available on the Meta account to connect
        try {
          const pages = await metaService.getPages();
          setAvailablePages(pages || []);
        } catch (e) { /* ignore */ }
        try {
          const ig = await metaService.getInstagramAccounts();
          setAvailableIg(ig || []);
        } catch (e) { /* ignore */ }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectMeta = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { url } = await metaService.getOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start Meta connection');
      setIsConnecting(false);
    }
  };

  const handleConnectPage = async (pageId: string) => {
    setBusyId(pageId);
    setError(null);
    try {
      await metaService.connectPage(pageId);
      setNotice('Page connected.');
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect page');
    } finally {
      setBusyId(null);
    }
  };

  const handleConnectIg = async (instagramId: string, facebookPageId: string) => {
    setBusyId(instagramId);
    setError(null);
    try {
      await metaService.connectInstagram(instagramId, facebookPageId);
      setNotice('Instagram account connected.');
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect Instagram');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnectPage = async (internalId: string) => {
    setBusyId(internalId);
    setError(null);
    try {
      await metaService.disconnectPage(internalId);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect page');
    } finally {
      setBusyId(null);
    }
  };

  const connectedPageIds = new Set(connectedPages.map((p) => p.pageId));
  const pagesToConnect = availablePages.filter((p) => !connectedPageIds.has(p.id));
  const connectedIgIds = new Set(connectedIg.map((a) => a.instagramId));
  const igToConnect = availableIg.filter((a) => a && a.id && !connectedIgIds.has(a.id));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white">Connected Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your Meta Business integrations.</p>
        </div>
        <button
          onClick={handleConnectMeta}
          disabled={isConnecting}
          className="px-6 py-3 bg-[#1877F2] text-white rounded-xl text-sm font-black flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
          {isConnecting ? 'Connecting…' : (metaConnected ? 'Reconnect Meta' : '+ Connect via Meta')}
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">{notice}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
      ) : !metaConnected ? (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-16 text-center">
          <h3 className="text-xl font-black dark:text-white mb-2">No Meta account connected</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Connect your Meta Business account to enable automation.</p>
          <button onClick={handleConnectMeta} disabled={isConnecting}
            className="px-8 py-4 bg-[#1877F2] text-white rounded-xl text-sm font-black mx-auto disabled:opacity-50">
            {isConnecting ? 'Connecting…' : 'Connect Facebook & Instagram'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available pages to connect */}
          <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-6">
            <h3 className="font-black text-lg dark:text-white mb-1">Available Facebook Pages</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">Choose which Pages to connect to Seekers AI.</p>
            {pagesToConnect.length === 0 ? (
              <p className="text-slate-400 text-sm">No more pages to connect (or none found on this account).</p>
            ) : (
              <div className="space-y-3">
                {pagesToConnect.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-[#1877F2] flex items-center justify-center text-white font-black">
                        {(p.name || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="font-black dark:text-white">{p.name}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">{p.category || 'Facebook Page'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleConnectPage(p.id)} disabled={busyId === p.id}
                      className="px-5 py-2.5 bg-[#1877F2] text-white rounded-xl text-xs font-black disabled:opacity-50">
                      {busyId === p.id ? 'Connecting…' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Available Instagram accounts */}
          {igToConnect.length > 0 && (
            <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-6">
              <h3 className="font-black text-lg dark:text-white mb-1">Available Instagram Accounts</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">Linked to your connected Pages.</p>
              <div className="space-y-3">
                {igToConnect.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-black">IG</div>
                      <div>
                        <p className="font-black dark:text-white">@{a.username}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">{a.facebookPageName || 'Instagram'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleConnectIg(a.id, a.facebookPageId)} disabled={busyId === a.id}
                      className="px-5 py-2.5 bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white rounded-xl text-xs font-black disabled:opacity-50">
                      {busyId === a.id ? 'Connecting…' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Connected */}
          <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-6">
            <h3 className="font-black text-lg dark:text-white mb-4">Connected</h3>
            {connectedPages.length === 0 && connectedIg.length === 0 ? (
              <p className="text-slate-400 text-sm">Nothing connected yet. Connect a Page above.</p>
            ) : (
              <div className="space-y-3">
                {connectedPages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-[#1877F2] flex items-center justify-center text-white font-black">{(p.name || '?').charAt(0)}</div>
                      <div>
                        <p className="font-black dark:text-white">{p.name}</p>
                        <p className="text-xs text-emerald-500 uppercase tracking-widest font-black">{p.isActive ? 'Connected' : 'Inactive'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDisconnectPage(p.id)} disabled={busyId === p.id}
                      className="px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-black disabled:opacity-50">
                      {busyId === p.id ? '…' : 'Disconnect'}
                    </button>
                  </div>
                ))}
                {connectedIg.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-gradient-to-tr from-[#f09433] to-[#bc1888] flex items-center justify-center text-white font-black">IG</div>
                      <div>
                        <p className="font-black dark:text-white">@{a.username}</p>
                        <p className="text-xs text-emerald-500 uppercase tracking-widest font-black">{a.isActive ? 'Connected' : 'Inactive'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ClientConnectedAccounts;
