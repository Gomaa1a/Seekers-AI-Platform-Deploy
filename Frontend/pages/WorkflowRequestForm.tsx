
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Addon } from '../types';
import Modal from '../components/Modal';
import { workflowRequestsService, knowledgeBasesService } from '../src/api';
import { Addon as AddonType, KnowledgeBase } from '../src/types';

const WorkflowRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [isContactModal, setIsContactModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    request_type: 'chatbot' as 'chatbot' | 'comments',
    knowledge_base_id: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  });
  
  // Available knowledge bases
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoadingKBs, setIsLoadingKBs] = useState(true);
  
  // Available addons from API
  const [addons, setAddons] = useState<AddonType[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isLoadingAddons, setIsLoadingAddons] = useState(true);

  // Fetch knowledge bases on mount
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        const response = await knowledgeBasesService.getAll();
        setKnowledgeBases(response.data || response);
      } catch (err) {
        console.error('Error fetching knowledge bases:', err);
      } finally {
        setIsLoadingKBs(false);
      }
    };
    fetchKnowledgeBases();
  }, []);

  // Fetch available addons on mount
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const response = await workflowRequestsService.getAvailableAddons();
        setAddons(response || [
          { id: '1', name: 'Google Sheets', price: 30, description: 'Automatically sync captured lead data and conversation logs directly to your spreadsheets.', icon: 'table_chart' },
          { id: '2', name: 'WhatsApp Notifications', price: 20, description: 'Send real-time alerts and follow-up messages to users via the WhatsApp Business API.', icon: 'chat' },
          { id: '3', name: 'CRM Integration', price: 50, description: 'Connect natively with HubSpot, Salesforce, or Pipedrive to manage your sales pipeline.', icon: 'hub' },
          { id: '4', name: 'Advanced Analytics', price: 40, description: 'Deep dive into user sentiment, drop-off rates, and granular bot performance metrics.', icon: 'insights' },
        ]);
      } catch (err) {
        // Use default addons if API fails
        setAddons([
          { id: '1', name: 'Google Sheets', price: 30, description: 'Automatically sync captured lead data and conversation logs directly to your spreadsheets.', icon: 'table_chart' },
          { id: '2', name: 'WhatsApp Notifications', price: 20, description: 'Send real-time alerts and follow-up messages to users via the WhatsApp Business API.', icon: 'chat' },
          { id: '3', name: 'CRM Integration', price: 50, description: 'Connect natively with HubSpot, Salesforce, or Pipedrive to manage your sales pipeline.', icon: 'hub' },
          { id: '4', name: 'Advanced Analytics', price: 40, description: 'Deep dive into user sentiment, drop-off rates, and granular bot performance metrics.', icon: 'insights' },
        ]);
      } finally {
        setIsLoadingAddons(false);
      }
    };
    fetchAddons();
  }, []);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!formData.title.trim() || !formData.description.trim()) {
        setError('Please fill in all required fields');
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const request = await workflowRequestsService.create({
        ...formData,
        addon_ids: selectedAddons,
      });
      
      setCreatedRequestId(request.id);
      setIsSuccessModal(true);
    } catch (err: any) {
      console.error('Error creating workflow request:', err);
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await workflowRequestsService.create({
        ...formData,
        addon_ids: selectedAddons,
        status: 'draft',
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error saving draft:', err);
      navigate('/dashboard');
    }
  };

  const handleContactSales = () => {
    setIsContactModal(true);
  };

  const selectedTotal = addons
    .filter(a => selectedAddons.includes(a.id))
    .reduce((acc, curr) => acc + (curr.price || 0), 0);
  const basePrice = 199;
  const totalPrice = basePrice + selectedTotal;

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-500">
      {/* Progress Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-primary text-sm font-black uppercase tracking-widest">Step {step} of 4</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight dark:text-white mt-1">
              {step === 1 ? "Describe Your Automation" : 
               step === 2 ? "Select Knowledge Base" :
               step === 3 ? "Enhance Your Automation" : 
               "Review & Confirm"}
            </h1>
          </div>
          <p className="text-slate-900 dark:text-primary text-sm font-black leading-none">{step * 25}% Complete</p>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(161,158,255,0.4)]" 
            style={{ width: `${step * 25}%` }}
          />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Select additional modules to scale your chatbot's capabilities and integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Form Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 space-y-6">
              <h2 className="text-xl font-black dark:text-white">Tell us about your automation needs</h2>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request Title *</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Instagram DM Automation for Product Inquiries" 
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-5 py-4 text-sm dark:text-white" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Automation Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, request_type: 'chatbot' }))}
                      className={`p-5 rounded-xl flex flex-col items-center gap-3 transition-all ${
                        formData.request_type === 'chatbot'
                          ? 'bg-primary/10 border border-primary text-primary'
                          : 'bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl">forum</span>
                      <span className="font-black text-sm">Chatbot</span>
                      <span className="text-xs text-center opacity-70">Auto-reply to DMs and messages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, request_type: 'comments' }))}
                      className={`p-5 rounded-xl flex flex-col items-center gap-3 transition-all ${
                        formData.request_type === 'comments'
                          ? 'bg-primary/10 border border-primary text-primary'
                          : 'bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl">mode_comment</span>
                      <span className="font-black text-sm">Comments</span>
                      <span className="text-xs text-center opacity-70">Auto-reply to post comments</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description *</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what you want your automation to do. Be as specific as possible about triggers, responses, and any conditions..."
                    rows={6}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-5 py-4 text-sm dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Knowledge Base Selection */}
          {step === 2 && (
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 space-y-6">
              <h2 className="text-xl font-black dark:text-white">Select Knowledge Base</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose which knowledge base your automation should use for responses.</p>
              
              {isLoadingKBs ? (
                <div className="flex items-center justify-center py-10">
                  <span className="animate-spin material-symbols-outlined text-3xl text-primary">progress_activity</span>
                </div>
              ) : knowledgeBases.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">folder_off</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No knowledge bases found.</p>
                  <button 
                    onClick={() => navigate('/knowledge-bases')}
                    className="mt-4 text-primary font-bold hover:underline"
                  >
                    Create a Knowledge Base
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {knowledgeBases.map((kb) => (
                    <div
                      key={kb.id}
                      onClick={() => setFormData(prev => ({ ...prev, knowledge_base_id: kb.id }))}
                      className={`p-5 rounded-xl border cursor-pointer transition-all ${
                        formData.knowledge_base_id === kb.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-slate-200 dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-xl flex items-center justify-center ${
                          kb.type === 'chatbot' ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          <span className="material-symbols-outlined">{kb.type === 'chatbot' ? 'forum' : 'mode_comment'}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-black dark:text-white">{kb.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(kb.word_count || 0).toLocaleString()} words • {kb.type}
                          </p>
                        </div>
                        <div className={`size-6 rounded-full border-2 flex items-center justify-center ${
                          formData.knowledge_base_id === kb.id 
                            ? 'bg-primary border-primary text-background-dark' 
                            : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {formData.knowledge_base_id === kb.id && (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setFormData(prev => ({ ...prev, knowledge_base_id: '' }))}
                className="text-sm text-slate-500 hover:text-primary transition-colors"
              >
                Skip - I'll add a knowledge base later
              </button>
            </div>
          )}

          {/* Step 3: Add-ons */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {addons.map((addon) => (
                  <div 
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`
                      relative flex flex-col gap-4 p-6 rounded-2xl border transition-all duration-300 cursor-pointer group
                      ${selectedAddons.includes(addon.id) 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xl shadow-primary/5' 
                        : 'border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark hover:border-primary/50'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`
                        size-14 rounded-xl flex items-center justify-center transition-colors
                        ${selectedAddons.includes(addon.id) ? 'bg-primary text-background-dark' : 'bg-primary/10 text-primary'}
                      `}>
                        <span className="material-symbols-outlined text-3xl">{addon.icon || 'extension'}</span>
                      </div>
                      <div className={`
                        size-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${selectedAddons.includes(addon.id) ? 'bg-primary border-primary text-background-dark' : 'border-slate-300 dark:border-slate-600'}
                      `}>
                        {selectedAddons.includes(addon.id) && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-black dark:text-white leading-none">{addon.name}</p>
                        <span className="text-primary text-xs font-black bg-primary/10 px-2 py-0.5 rounded tracking-tighter">
                          +${addon.price || 0}/mo
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed font-medium">{addon.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-border-dark bg-slate-50/30 dark:bg-slate-800/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <span className="material-symbols-outlined">help</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-tight">
                    Don't see what you need? We can build custom integrations for your enterprise stack.
                  </p>
                </div>
                <button onClick={handleContactSales} className="text-primary font-black text-sm px-4 py-2 hover:bg-primary/10 rounded-lg transition-all">Contact Sales</button>
              </div>
            </>
          )}

          {/* Step 4: Priority & Review */}
          {step === 4 && (
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 space-y-6">
              <h2 className="text-xl font-black dark:text-white">Review & Priority</h2>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority Level</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['low', 'normal', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority }))}
                      className={`p-4 rounded-xl text-center transition-all ${
                        formData.priority === priority
                          ? priority === 'urgent' ? 'bg-red-500/10 border border-red-500 text-red-500'
                            : priority === 'high' ? 'bg-orange-500/10 border border-orange-500 text-orange-500'
                            : 'bg-primary/10 border border-primary text-primary'
                          : 'bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      <span className="font-black text-sm capitalize">{priority}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 dark:border-border-dark space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Request Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Title</span>
                    <span className="font-bold dark:text-white text-sm">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Type</span>
                    <span className="font-bold dark:text-white text-sm capitalize">{formData.request_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Add-ons</span>
                    <span className="font-bold dark:text-white text-sm">{selectedAddons.length} selected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing Summary */}
        <div className="lg:col-span-4 sticky top-28">
          <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-black dark:text-white mb-8">Estimate Summary</h3>
            
            <div className="space-y-5 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Base Workflow Plan</span>
                <span className="font-bold dark:text-white">${basePrice}.00</span>
              </div>
              
              {addons.filter(a => selectedAddons.includes(a.id)).map(addon => (
                <div key={addon.id} className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-right-2 duration-300">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{addon.name} Add-on</span>
                  <span className="font-bold text-primary">+${addon.price || 0}.00</span>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-200 dark:border-border-dark flex justify-between items-center">
                <span className="text-base font-black dark:text-white uppercase tracking-wider">Total Monthly</span>
                <span className="text-3xl font-black text-primary">${totalPrice}.00</span>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={handleContinue} disabled={isSubmitting} className="w-full bg-primary text-background-dark font-black py-4 px-6 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>
                    Submitting...
                  </>
                ) : step === 4 ? (
                  <>
                    Submit Request
                    <span className="material-symbols-outlined text-[20px] font-black">send</span>
                  </>
                ) : (
                  <>
                    Continue
                    <span className="material-symbols-outlined text-[20px] font-black">arrow_forward</span>
                  </>
                )}
              </button>
              <button onClick={handleSaveDraft} className="w-full bg-transparent text-slate-500 dark:text-slate-400 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                Save as Draft
              </button>
            </div>

            <div className="mt-8 flex items-start gap-3 p-4 bg-slate-50 dark:bg-background-dark rounded-xl">
              <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Final pricing may vary after review of technical requirements. Prices are billed monthly in advance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isContactModal} onClose={() => setIsContactModal(false)} title="Contact Enterprise Sales">
        <div className="space-y-6">
          <p className="text-sm text-slate-500 font-medium">Looking for custom ERP, legacy software, or bespoke AI training? Our architects are ready.</p>
          <div className="space-y-4">
            <input type="text" placeholder="Your Requirements..." className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-5 py-3 text-sm" />
            <button onClick={() => setIsContactModal(false)} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Send Inquiry</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isSuccessModal} onClose={() => setIsSuccessModal(false)} title="Request Received">
        <div className="text-center space-y-6">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
             <span className="material-symbols-outlined text-4xl font-black">send</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Your request #{createdRequestId ? createdRequestId.slice(0, 8).toUpperCase() : 'WR-XXXX'} has been sent to our engineers. You will receive an update in the 'Workflow Requests' section within 24 hours.</p>
          <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest">Return to Dashboard</button>
        </div>
      </Modal>

      {/* Visual Timeline Footer */}
      <div className="pt-16 border-t border-slate-200 dark:border-border-dark">
        <h4 className="text-center text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-12">Request-to-Live Lifecycle</h4>
        <div className="relative flex justify-between items-start max-w-4xl mx-auto px-4">
          <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 z-0"></div>
          <div className="absolute top-5 left-0 h-1 bg-primary z-10 shadow-[0_0_10px_rgba(161,158,255,0.5)] transition-all duration-1000" style={{ width: `${step * 25}%` }}></div>
          
          {[
            { name: 'Request', icon: 'edit_note', active: step >= 1 },
            { name: 'Review', icon: 'visibility', active: step >= 2 },
            { name: 'Dev', icon: 'code', active: step >= 3 },
            { name: 'Testing', icon: 'biotech', active: step >= 4 },
            { name: 'Live', icon: 'rocket_launch', active: step >= 5 },
          ].map((s, idx) => (
            <div key={s.name} className="relative z-20 flex flex-col items-center gap-3 w-20">
              <div className={`
                size-10 rounded-full flex items-center justify-center ring-8 ring-background-light dark:ring-background-dark transition-all duration-300
                ${s.active ? 'bg-primary text-background-dark scale-110 shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}
              `}>
                <span className="material-symbols-outlined text-[20px] font-bold">{s.icon}</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${s.active ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowRequestForm;
