
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { adminService } from '../src/api';
import { WorkflowRequest, N8nWorkflow } from '../src/types';

const AdminWorkflowFulfillment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'communication' | 'connection' | 'assets'>('connection');
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Request data
  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [messages, setMessages] = useState<{sender: 'client' | 'admin', text: string, time: string}[]>([
    { sender: 'client', text: 'Hello, can we add Instagram comment automation to this too?', time: '2h ago' },
    { sender: 'admin', text: "Absolutely. I've added the option to the 'Social Connections' tab. You can now toggle it on.", time: '1h ago' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getWorkflowRequestDetails(id!);
      setRequest(data);
      if (data.webhook_url) {
        setWebhookUrl(data.webhook_url);
      }
    } catch (err: any) {
      console.error('Error fetching request details:', err);
      setError(err.response?.data?.error || 'Failed to load request details');
      // Use fallback data
      setRequest({
        id: id || 'REQ-98234',
        organization_id: '1',
        title: 'Order Refund Bot',
        description: 'Automated refund processing for customer complaints',
        request_type: 'chatbot',
        status: 'in_progress',
        priority: 'high',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!webhookUrl.trim()) {
      setError('Please enter a webhook URL');
      return;
    }
    
    setIsDeploying(true);
    try {
      await adminService.fulfillWorkflowRequest(id!, {
        webhook_url: webhookUrl,
        channels: selectedChannels,
        status: 'completed',
      });
      setIsSuccessModal(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deploy workflow');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) return;
    
    setIsTestLoading(true);
    try {
      // Test webhook endpoint
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
      // Show success briefly
    } catch (err) {
      console.error('Webhook test failed:', err);
    } finally {
      setTimeout(() => setIsTestLoading(false), 1000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages(prev => [...prev, {
      sender: 'admin',
      text: newMessage,
      time: 'Just now',
    }]);
    setNewMessage('');
    
    // In production, send via API
    // adminService.sendWorkflowMessage(id!, newMessage);
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `Created ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `Created ${diffHours}h ago`;
    return 'Created just now';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 bg-white dark:bg-surface-dark p-8 rounded-2xl border border-slate-200 dark:border-border-dark shadow-xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-3xl font-black tracking-tighter dark:text-white">{request?.title || 'Workflow Fulfillment'}</h1>
            <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${
              request?.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
              request?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
              'bg-primary/10 text-primary'
            }`}>
              {request?.status?.replace('_', ' ') || 'In Progress'}
            </span>
          </div>
          <div className="flex flex-wrap gap-5 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">fingerprint</span> {request?.id?.slice(0, 8).toUpperCase() || 'REQ-XXXX'}</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">corporate_fare</span> {(request as any)?.organization?.name || 'Client'}</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {request?.created_at ? formatTimeAgo(request.created_at) : 'Unknown'}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('communication')} className="px-6 py-2.5 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all">
            Request Info
          </button>
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="px-6 py-2.5 bg-primary text-background-dark rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
            {isDeploying && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
            Deploy Workflow
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-border-dark gap-10">
        <button 
          onClick={() => setActiveTab('connection')}
          className={`pb-4 border-b-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'connection' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>
          Social Connections
        </button>
        <button 
          onClick={() => setActiveTab('communication')}
          className={`pb-4 border-b-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'communication' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>
          Communication
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`pb-4 border-b-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>
          Client Assets
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {activeTab === 'connection' && (
          <div className="col-span-12 space-y-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Automation Webhook Linker</h3>
              </div>
              <div className="p-8 space-y-10">
                <div className="max-w-3xl">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Automation Webhook URL</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://automation.seekers-ai.io/webhook/..."
                      className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl text-sm px-5 py-3 font-medium dark:text-white"
                    />
                    <button 
                      onClick={handleTestWebhook}
                      disabled={isTestLoading || !webhookUrl}
                      className="bg-primary/10 text-primary px-5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50">
                      {isTestLoading && <span className="material-symbols-outlined text-sm animate-spin">refresh</span>}
                      Test
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase italic">Enter the unique webhook URL from the automation builder.</p>
                  {testResult && (
                    <p className={`text-xs mt-2 font-bold ${testResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                      {testResult.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary">chat_bubble</span>
                       Messenger & DMs
                    </h4>
                    <div className="space-y-4">
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Facebook Messenger Bot</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Connect to tenant FB Pages</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('facebook_messenger')}
                            onChange={() => toggleChannel('facebook_messenger')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Instagram DM Bot</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Direct message automation</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('instagram_dm')}
                            onChange={() => toggleChannel('instagram_dm')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary">forum</span>
                       Post Comments
                    </h4>
                    <div className="space-y-4">
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Facebook Comments</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Auto-reply to FB posts</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('facebook_comments')}
                            onChange={() => toggleChannel('facebook_comments')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Instagram Comments</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Auto-reply to IG posts</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('instagram_comments')}
                            onChange={() => toggleChannel('instagram_comments')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary">auto_awesome</span>
                       Workflow Trigger
                    </h4>
                    <div className="space-y-4">
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Lead Event Hook</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Trigger on conversion</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('lead_event')}
                            onChange={() => toggleChannel('lead_event')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                       <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-100 dark:border-border-dark cursor-pointer group">
                          <div className="flex flex-col">
                             <span className="text-sm font-bold dark:text-white group-hover:text-primary transition-colors">Keyword Auto-Action</span>
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Single keyword trigger</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={selectedChannels.includes('keyword_trigger')}
                            onChange={() => toggleChannel('keyword_trigger')}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                       </label>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-100 dark:border-border-dark">
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                           <span className="material-symbols-outlined text-3xl">hub</span>
                        </div>
                        <div>
                           <p className="text-sm font-black dark:text-white uppercase">Multi-Channel Bridge</p>
                           <p className="text-xs text-slate-500 font-medium">Link this single automation webhook to all selected channels above.</p>
                           {selectedChannels.length > 0 && (
                             <p className="text-[10px] text-primary font-bold mt-1">{selectedChannels.length} channel(s) selected</p>
                           )}
                        </div>
                     </div>
                     <button 
                       onClick={handleDeploy} 
                       disabled={isDeploying || !webhookUrl || selectedChannels.length === 0}
                       className="px-8 py-3 bg-primary text-background-dark rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2">
                       {isDeploying && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
                       Sync Channels
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="col-span-12 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm h-full flex flex-col animate-in fade-in duration-300 min-h-[500px]">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Request Chat</h3>
                {request && (
                  <div className="text-xs text-slate-500">
                    <span className="font-bold">Request:</span> {request.title}
                  </div>
                )}
              </div>
              <div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[400px]">
                 {messages.length === 0 ? (
                   <div className="text-center text-slate-400 py-8">
                     <span className="material-symbols-outlined text-4xl mb-2">chat</span>
                     <p className="text-sm">No messages yet. Start the conversation with the client.</p>
                   </div>
                 ) : (
                   messages.map((msg, idx) => (
                     <div key={idx} className={`flex gap-4 max-w-[80%] ${msg.isAdmin ? 'self-end flex-row-reverse ml-auto' : ''}`}>
                        <div className={`size-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${msg.isAdmin ? 'bg-primary' : 'bg-slate-400'}`}>
                          {msg.isAdmin ? 'SA' : 'CL'}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm ${msg.isAdmin ? 'bg-primary text-background-dark rounded-tr-none font-medium' : 'bg-slate-100 dark:bg-background-dark rounded-tl-none dark:text-slate-300'}`}>
                           {msg.content}
                           <div className={`text-[10px] mt-1 ${msg.isAdmin ? 'text-primary-dark/60' : 'text-slate-400'}`}>
                             {formatTimeAgo(msg.timestamp)}
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-border-dark">
                 <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Reply to client..." 
                      className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-5 py-3 text-sm" 
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="bg-primary text-background-dark px-6 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50">
                      Send
                    </button>
                 </form>
              </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="col-span-12 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark p-8 animate-in fade-in duration-300">
             <h3 className="text-lg font-black dark:text-white uppercase tracking-widest mb-6">Linked Knowledge Bases</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(request as any)?.knowledge_bases?.length > 0 ? (
                  (request as any).knowledge_bases.map((kb: any) => (
                    <div key={kb.id} className="p-6 bg-slate-50 dark:bg-background-dark rounded-2xl border border-slate-100 dark:border-border-dark flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary">database</span>
                          <div>
                             <p className="text-sm font-bold dark:text-white">{kb.name}</p>
                             <p className="text-[10px] text-slate-400 font-black uppercase">{kb.type} • {kb.status}</p>
                          </div>
                       </div>
                       <button onClick={() => navigate('/knowledge-bases')} className="text-primary text-xs font-black uppercase tracking-widest hover:underline">View KB</button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">database</span>
                    <p className="text-sm">No knowledge bases linked to this request.</p>
                  </div>
                )}
             </div>

             {request?.description && (
               <div className="mt-8 pt-8 border-t border-slate-100 dark:border-border-dark">
                 <h4 className="text-sm font-black dark:text-white uppercase tracking-widest mb-4">Request Description</h4>
                 <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{request.description}</p>
               </div>
             )}

             {(request as any)?.addons?.length > 0 && (
               <div className="mt-8 pt-8 border-t border-slate-100 dark:border-border-dark">
                 <h4 className="text-sm font-black dark:text-white uppercase tracking-widest mb-4">Selected Addons</h4>
                 <div className="flex flex-wrap gap-2">
                   {(request as any).addons.map((addon: string, idx: number) => (
                     <span key={idx} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                       {addon}
                     </span>
                   ))}
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title="Deployment Success">
        <div className="text-center space-y-6">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
             <span className="material-symbols-outlined text-4xl font-black">verified</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Automation workflow has been successfully linked to the client's social channels. Monitoring active.</p>
          <button onClick={() => navigate('/admin/requests')} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Back to Queue</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminWorkflowFulfillment;
