
import React, { useState, useEffect } from 'react';
import { KnowledgeBase } from '../types';
import Modal from '../components/Modal';
import { knowledgeBasesService } from '../src/api';
import { KnowledgeBase as KBType } from '../src/types';

const KnowledgeBaseLibrary: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [kbItems, setKbItems] = useState<KBType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Create form state
  const [newKbName, setNewKbName] = useState('');
  const [newKbType, setNewKbType] = useState<'chatbot' | 'comments'>('chatbot');
  const [newKbContent, setNewKbContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const fetchKnowledgeBases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await knowledgeBasesService.getAll();
      setKbItems(response.data || response);
    } catch (err: any) {
      console.error('Error fetching knowledge bases:', err);
      setError(err.response?.data?.error || 'Failed to load knowledge bases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKb = async () => {
    if (!newKbName.trim()) {
      setCreateError('Please enter a name for the knowledge base');
      return;
    }
    
    setIsCreating(true);
    setCreateError(null);
    
    try {
      let newKb: KBType;
      
      if (selectedFile) {
        // Upload file
        newKb = await knowledgeBasesService.uploadDocument(selectedFile, {
          name: newKbName,
          type: newKbType,
        });
      } else if (newKbContent.trim()) {
        // Create with raw content
        newKb = await knowledgeBasesService.create({
          name: newKbName,
          type: newKbType,
          content: newKbContent,
        });
      } else {
        setCreateError('Please provide content or upload a file');
        setIsCreating(false);
        return;
      }
      
      // Add to list
      setKbItems(prev => [newKb, ...prev]);
      
      // Reset form
      setNewKbName('');
      setNewKbType('chatbot');
      setNewKbContent('');
      setSelectedFile(null);
      setIsCreateModalOpen(false);
      
    } catch (err: any) {
      console.error('Error creating knowledge base:', err);
      setCreateError(err.response?.data?.error || 'Failed to create knowledge base');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKb = async (kbId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return;
    
    try {
      await knowledgeBasesService.delete(kbId);
      setKbItems(prev => prev.filter(kb => kb.id !== kbId));
    } catch (err: any) {
      console.error('Error deleting knowledge base:', err);
      alert(err.response?.data?.error || 'Failed to delete knowledge base');
    }
  };

  const filteredItems = kbItems.filter(kb => {
    if (filterType !== 'all' && kb.type !== filterType) return false;
    if (filterStatus !== 'all' && kb.status !== filterStatus) return false;
    return true;
  });

  const totalWords = kbItems.reduce((sum, kb) => sum + (kb.word_count || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right duration-700">
      <div className="flex flex-wrap justify-between items-end gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tighter dark:text-white">Knowledge Base Library</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Manage and organize your AI training data for Meta chatbots.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-xl h-14 px-8 bg-primary text-background-dark text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined font-black">add</span>
          Create Knowledge Base
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterType === 'all' 
                ? 'bg-primary/10 text-primary border border-primary/50' 
                : 'bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white border border-transparent hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-lg">category</span>
            All Types
          </button>
          <button 
            onClick={() => setFilterType('chatbot')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterType === 'chatbot' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white hover:bg-primary/10 hover:text-primary'
            }`}
          >
            Chatbots
          </button>
          <button 
            onClick={() => setFilterType('comments')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterType === 'comments' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-white hover:bg-primary/10 hover:text-primary'
            }`}
          >
            Comments
          </button>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="training">Training</option>
          </select>
          <button 
            onClick={fetchKnowledgeBases}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button onClick={fetchKnowledgeBases} className="mt-4 text-primary font-bold hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((kb) => (
            <div 
              key={kb.id} 
              className="group flex flex-col bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300"
            >
              <div className={`h-36 relative flex items-center justify-center p-6 ${
                kb.type === 'chatbot' ? 'bg-gradient-to-br from-primary/10 to-indigo-500/10' : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10'
              }`}>
                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                  kb.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 
                  kb.status === 'training' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-slate-500/10 text-slate-500'
                }`}>
                  {kb.status}
                </div>
                <div className="size-14 bg-white dark:bg-background-dark rounded-2xl shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 border border-slate-100 dark:border-border-dark">
                  <span className={`material-symbols-outlined text-2xl ${kb.type === 'chatbot' ? 'text-primary' : 'text-purple-400'}`}>
                    {kb.type === 'chatbot' ? 'forum' : 'mode_comment'}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-black dark:text-white mb-4 group-hover:text-primary transition-colors">{kb.name}</h3>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">description</span>
                    {(kb.word_count || 0).toLocaleString()} words processed
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-sm">account_tree</span>
                    Used in {kb.workflow_count || 0} Workflows
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-border-dark flex justify-between items-center">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{kb.type}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteKb(kb.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    <button className="text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-border-dark p-8 hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer h-full min-h-[350px]"
          >
            <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-background-dark transition-all duration-300 mb-4 group-hover:scale-110">
              <span className="material-symbols-outlined text-2xl font-bold">add</span>
            </div>
            <p className="text-slate-900 dark:text-white font-black text-lg">New Knowledge Base</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mt-2 font-medium max-w-[180px]">
              Add a PDF, Website URL, or raw text to train your AI.
            </p>
          </div>
        </div>
      )}

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Provision Knowledge Base">
        <div className="space-y-6">
          {createError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{createError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
              <input 
                type="text" 
                value={newKbName}
                onChange={(e) => setNewKbName(e.target.value)}
                placeholder="Internal FAQ v1" 
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm dark:text-white" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setNewKbType('chatbot')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    newKbType === 'chatbot' 
                      ? 'bg-primary/10 border border-primary/40 text-primary' 
                      : 'bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400'
                  }`}
                >
                   <span className="material-symbols-outlined">forum</span>
                   <span className="text-[10px] font-black uppercase">Chatbot</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setNewKbType('comments')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    newKbType === 'comments' 
                      ? 'bg-primary/10 border border-primary/40 text-primary' 
                      : 'bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400'
                  }`}
                >
                   <span className="material-symbols-outlined">mode_comment</span>
                   <span className="text-[10px] font-black uppercase">Comments</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Source</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
                  selectedFile ? 'bg-primary/10 border border-primary/40' : 'bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark hover:border-primary/50'
                }`}>
                   <input 
                     type="file" 
                     accept=".pdf,.txt,.doc,.docx"
                     className="hidden"
                     onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                   />
                   <span className={`material-symbols-outlined ${selectedFile ? 'text-primary' : ''}`}>upload_file</span>
                   <span className="text-[10px] font-black uppercase">{selectedFile ? selectedFile.name.slice(0, 15) + '...' : 'Upload PDF'}</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    !selectedFile && newKbContent 
                      ? 'bg-primary/10 border border-primary/40' 
                      : 'bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark hover:border-primary/50'
                  }`}
                >
                   <span className="material-symbols-outlined">edit_note</span>
                   <span className="text-[10px] font-black uppercase">Raw Text</span>
                </button>
              </div>
            </div>
            
            {!selectedFile && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Content</label>
                <textarea 
                  value={newKbContent}
                  onChange={(e) => setNewKbContent(e.target.value)}
                  placeholder="Paste your knowledge base content here..."
                  rows={6}
                  className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm dark:text-white"
                />
              </div>
            )}
          </div>
          
          <button 
            onClick={handleCreateKb} 
            disabled={isCreating || !newKbName.trim()}
            className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                Processing...
              </>
            ) : (
              'Begin Processing'
            )}
          </button>
        </div>
      </Modal>

      {/* Footer Meta */}
      <footer className="pt-10 border-t border-slate-200 dark:border-border-dark flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-sm font-bold">bolt</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
              Platform Usage: <span className="text-slate-900 dark:text-white">{totalWords.toLocaleString()} / 50,000 words</span>
            </p>
          </div>
          <div className="w-48 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(161,158,255,0.6)]" style={{ width: `${Math.min((totalWords / 50000) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="flex gap-8">
          <button className="text-slate-400 hover:text-primary text-xs font-bold uppercase tracking-wider transition-colors">API Docs</button>
          <button className="text-slate-400 hover:text-primary text-xs font-bold uppercase tracking-wider transition-colors">System Status</button>
          <button className="text-slate-400 hover:text-primary text-xs font-bold uppercase tracking-wider transition-colors">Privacy</button>
        </div>
      </footer>
    </div>
  );
};

export default KnowledgeBaseLibrary;
