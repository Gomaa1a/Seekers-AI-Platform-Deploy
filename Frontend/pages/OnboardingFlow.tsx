
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { metaService, knowledgeBasesService, workflowRequestsService, organizationService } from '../src/api';
import { useAuth } from '../src/context/AuthContext';
import { KnowledgeBase, MetaConnection } from '../src/types';

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  
  // Meta connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(null);
  
  // Knowledge base state
  const [kbName, setKbName] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [isSavingKB, setIsSavingKB] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [savedKnowledgeBase, setSavedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  
  // Workflow request state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      setConnectionError('Facebook authorization was cancelled or denied.');
      setActiveStep(2);
      return;
    }
    
    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  // Check existing Meta connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await metaService.getConnectionStatus();
        if (status.connected && status.connection) {
          setMetaConnection(status.connection);
          // Skip to step 3 if already connected
          if (activeStep === 2) {
            setActiveStep(3);
          }
        }
      } catch (err) {
        // No existing connection, that's fine
      }
    };
    checkConnection();
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const response = await metaService.handleOAuthCallback(code, state);
      setMetaConnection(response.connection);
      setActiveStep(3);
      // Clear URL params
      window.history.replaceState({}, '', '/onboarding');
    } catch (err: any) {
      setConnectionError(err.response?.data?.error || 'Failed to complete Facebook connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMetaConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const { url } = await metaService.getOAuthUrl();
      // Redirect to Meta OAuth
      window.location.href = url;
    } catch (err: any) {
      setConnectionError(err.response?.data?.error || 'Failed to initiate Facebook connection');
      setIsConnecting(false);
    }
  };

  const handleSaveKnowledgeBase = async () => {
    if (!kbName.trim() || !kbContent.trim()) {
      setKbError('Please provide both a name and content for your knowledge base.');
      return;
    }
    
    setIsSavingKB(true);
    setKbError(null);
    try {
      const kb = await knowledgeBasesService.create({
        name: kbName,
        type: 'chatbot',
        content: kbContent,
      });
      setSavedKnowledgeBase(kb);
      setActiveStep(4);
    } catch (err: any) {
      setKbError(err.response?.data?.error || 'Failed to save knowledge base');
    } finally {
      setIsSavingKB(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      // Create initial workflow request for the team to review
      await workflowRequestsService.create({
        title: 'Initial Onboarding Setup',
        description: `New organization onboarding completed. Knowledge base "${savedKnowledgeBase?.name || 'N/A'}" created. Ready for workflow configuration.`,
        request_type: 'chatbot',
      });
      
      // Update organization onboarding status
      await organizationService.updateSettings({
        onboarding_completed: true,
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      // Still navigate even if request fails
      navigate('/dashboard');
    }
  };

  const steps = [
    { id: 1, name: 'Welcome', desc: 'Platform introduction' },
    { id: 2, name: 'Connect Meta', desc: 'Link FB & Instagram' },
    { id: 3, name: 'AI Knowledge', desc: 'Train your model' },
    { id: 4, name: 'Final Request', desc: 'Automation request' },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      {/* Onboarding Sidebar */}
      <div className="w-80 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-border-dark hidden lg:flex flex-col p-10">
        {/* Enlarged Sidebar Logo per request (100px) */}
        <Logo size={100} showText={false} className="mb-16 !items-start" />
        <div className="space-y-12 flex-1">
          {steps.map((s) => (
            <div key={s.id} className="flex gap-5 group">
              <div className={`
                size-10 rounded-xl flex items-center justify-center font-black transition-all duration-300
                ${activeStep === s.id ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-110' : 
                  activeStep > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-background-dark text-slate-400'}
              `}>
                {activeStep > s.id ? <span className="material-symbols-outlined text-lg">check</span> : s.id}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-black ${activeStep === s.id ? 'text-primary' : 'text-slate-400'}`}>{s.name}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-10 border-t border-slate-100 dark:border-border-dark">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Help Center</p>
           <button onClick={() => navigate('/settings')} className="text-primary text-xs font-black mt-2 hover:underline">Support Ticket</button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 md:p-16 lg:p-24 flex items-center justify-center">
        <div className="w-full max-w-4xl animate-in slide-in-from-bottom duration-700">
          {activeStep === 1 && (
            <div className="space-y-10 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="text-6xl font-black dark:text-white leading-tight tracking-tighter">Welcome to the future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 italic">Enterprise Support.</span></h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                  You're just minutes away from connecting your business social profiles to a world-class AI automation engine. Let's set up your environment.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-border-dark shadow-sm">
                   <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined">hub</span>
                   </div>
                   <h3 className="text-lg font-black dark:text-white">Unified Inbox</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Manage all Instagram and Facebook messages in one high-performance interface.</p>
                </div>
                <div className="p-8 rounded-3xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-border-dark shadow-sm">
                   <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined">auto_awesome</span>
                   </div>
                   <h3 className="text-lg font-black dark:text-white">AI Automation</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Custom-built Automation workflows that think, act, and respond like your best agent.</p>
                </div>
              </div>
              <button onClick={() => setActiveStep(2)} className="px-12 py-5 bg-primary text-background-dark font-black rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm">
                Let's Get Started
              </button>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-10">
              <div className="text-center">
                <h2 className="text-4xl font-black dark:text-white">Connect Meta Business</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 font-medium">Link your Facebook and Instagram accounts to enable automation.</p>
              </div>
              
              {connectionError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium">{connectionError}</p>
                </div>
              )}
              
              {metaConnection ? (
                <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-12 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center gap-8 shadow-2xl">
                  <div className="size-20 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-4xl font-black">check_circle</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black dark:text-white">Successfully Connected!</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Your Meta Business account is now linked.</p>
                  </div>
                  <button onClick={() => setActiveStep(3)} className="px-12 py-5 bg-primary text-background-dark font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs">
                    Continue to AI Training
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-12 border border-slate-100 dark:border-border-dark flex flex-col items-center gap-10 shadow-2xl shadow-primary/5">
                   <div className="flex gap-8 items-center">
                      <div className="size-20 rounded-2xl bg-slate-50 dark:bg-background-dark flex items-center justify-center border border-slate-200 dark:border-border-dark">
                         <Logo size={50} showText={false} />
                      </div>
                      <div className="h-0.5 w-24 bg-primary relative">
                         <div className="absolute inset-0 bg-primary blur-md opacity-40 animate-pulse"></div>
                      </div>
                      <div className="size-20 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                         <span className="material-symbols-outlined text-4xl font-black">facebook</span>
                      </div>
                   </div>
                   <div className="space-y-6 text-center max-w-md">
                      <button 
                        onClick={handleMetaConnect} 
                        disabled={isConnecting}
                        className="w-full py-5 bg-[#1877F2] text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:brightness-110 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {isConnecting ? (
                           <>
                             <span className="animate-spin material-symbols-outlined font-black">progress_activity</span>
                             Connecting...
                           </>
                         ) : (
                           <>
                             <span className="material-symbols-outlined font-black">link</span>
                             Connect with Facebook
                           </>
                         )}
                      </button>
                      <p className="text-xs text-slate-400 font-medium">Seekers AI only requests the minimum permissions required to manage messages and comments. You can revoke access at any time.</p>
                      <button 
                        onClick={() => setActiveStep(3)} 
                        className="text-primary text-xs font-bold hover:underline"
                      >
                        Skip for now (connect later in settings)
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-10">
               <div className="text-center">
                <h2 className="text-4xl font-black dark:text-white">Train Your AI Agent</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 font-medium">Provide the knowledge base your chatbot will use to respond.</p>
              </div>
              
              {kbError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium">{kbError}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-8 bg-white dark:bg-surface-dark rounded-[2rem] p-10 border border-slate-100 dark:border-border-dark shadow-xl">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Base Name</label>
                       <input 
                         type="text" 
                         value={kbName}
                         onChange={(e) => setKbName(e.target.value)}
                         placeholder="e.g., Summer Collection FAQ" 
                         className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 font-bold dark:text-white" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raw Information / Content</label>
                       <textarea 
                         rows={10} 
                         value={kbContent}
                         onChange={(e) => setKbContent(e.target.value)}
                         placeholder="Type or paste your business information here. Include product details, pricing, shipping info, FAQs, return policies, and any other information your AI agent should know about." 
                         className="w-full bg-slate-50 dark:bg-background-dark border-none rounded-xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 dark:text-white"
                       ></textarea>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
                      {kbContent.length} characters entered
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                   <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2rem]">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Best Practices</h4>
                      <ul className="space-y-4">
                         {['Be specific about pricing', 'Include shipping times', 'List return policies', 'Provide contact info'].map(t => (
                           <li key={t} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                             <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                             {t}
                           </li>
                         ))}
                      </ul>
                   </div>
                   <button 
                     onClick={handleSaveKnowledgeBase} 
                     disabled={isSavingKB || !kbName.trim() || !kbContent.trim()}
                     className="w-full py-5 bg-primary text-background-dark font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      {isSavingKB ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                          Saving...
                        </>
                      ) : (
                        'Save & Continue'
                      )}
                   </button>
                   <button 
                     onClick={() => setActiveStep(4)} 
                     className="w-full text-primary text-xs font-bold hover:underline"
                   >
                     Skip for now (add later)
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-10 text-center">
               <div className="size-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-5xl font-black">rocket_launch</span>
               </div>
               <h2 className="text-5xl font-black dark:text-white tracking-tight">Onboarding Complete!</h2>
               <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
                 Your organization is now provisioned. Our engineers have been notified and will review your initial setup within 24 hours.
               </p>
               
               {/* Summary of what was set up */}
               <div className="max-w-md mx-auto bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-border-dark text-left">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Setup Summary</h4>
                 <div className="space-y-3">
                   <div className="flex items-center gap-3">
                     <span className={`material-symbols-outlined text-sm ${metaConnection ? 'text-emerald-500' : 'text-slate-400'}`}>
                       {metaConnection ? 'check_circle' : 'circle'}
                     </span>
                     <span className="text-sm font-medium dark:text-white">
                       Meta Business {metaConnection ? 'Connected' : 'Not connected (can add later)'}
                     </span>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className={`material-symbols-outlined text-sm ${savedKnowledgeBase ? 'text-emerald-500' : 'text-slate-400'}`}>
                       {savedKnowledgeBase ? 'check_circle' : 'circle'}
                     </span>
                     <span className="text-sm font-medium dark:text-white">
                       Knowledge Base {savedKnowledgeBase ? `"${savedKnowledgeBase.name}" created` : 'Not created (can add later)'}
                     </span>
                   </div>
                 </div>
               </div>
               
               <button 
                 onClick={handleCompleteOnboarding} 
                 disabled={isSubmitting}
                 className="px-16 py-6 bg-primary text-background-dark font-black rounded-2xl shadow-2xl shadow-primary/30 text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
               >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined">progress_activity</span>
                      Finalizing...
                    </>
                  ) : (
                    'Enter Console'
                  )}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
