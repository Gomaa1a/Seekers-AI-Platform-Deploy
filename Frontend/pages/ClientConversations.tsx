
import React, { useState, useEffect } from 'react';
import { analyticsService } from '../src/api/services/analytics';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  platform: string;
  avatar: string;
  isOnline?: boolean;
  unread?: number;
}

interface Message {
  id: string;
  content: string;
  isOutgoing: boolean;
  timestamp: string;
}

const ClientConversations: React.FC = () => {
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await analyticsService.getConversations();
      setConversations(response.data || []);
      if (response.data?.length > 0) {
        setSelectedConversation(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      // Fallback to mock data
      const mockConversations = [
        { id: '1', name: 'Sarah Smith', lastMessage: 'When will my order arrive?', time: '2m', platform: 'Instagram', avatar: 'https://i.pravatar.cc/100?u=1', isOnline: true, unread: 2 },
        { id: '2', name: 'John Doe', lastMessage: 'The discount code isnt working.', time: '15m', platform: 'Messenger', avatar: 'https://i.pravatar.cc/100?u=2', isOnline: false, unread: 0 },
        { id: '3', name: 'Elena Rossi', lastMessage: 'Do you ship to Italy?', time: '1h', platform: 'Instagram', avatar: 'https://i.pravatar.cc/100?u=3', isOnline: true, unread: 1 },
        { id: '4', name: 'Mike Chen', lastMessage: 'Thanks for the help!', time: '3h', platform: 'Messenger', avatar: 'https://i.pravatar.cc/100?u=4', isOnline: false, unread: 0 },
      ];
      setConversations(mockConversations);
      setSelectedConversation(mockConversations[0]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await analyticsService.getConversationMessages(conversationId);
      setMessages(response.data || []);
    } catch (err) {
      // Fallback to mock messages
      setMessages([
        { id: '1', content: 'Hi there! I was wondering when my order will be shipped? I ordered it 3 days ago.', isOutgoing: false, timestamp: '10:30 AM' },
        { id: '2', content: 'Hello Sarah! Checking that for you now. Our system shows it was picked up by the courier this morning! 🚚', isOutgoing: true, timestamp: '10:32 AM' },
        { id: '3', content: 'Oh thats great news! Do you have a tracking number?', isOutgoing: false, timestamp: '10:33 AM' },
        { id: '4', content: 'Yes! Your tracking number is TRK-2024-00145. You can track it on our website.', isOutgoing: true, timestamp: '10:35 AM' },
      ]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation) return;
    
    // Optimistically add message
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      isOutgoing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    // In production, this would send via API
    try {
      // await analyticsService.sendMessage(selectedConversation.id, message);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return '📸';
      case 'messenger': return '💬';
      case 'facebook': return '👤';
      default: return '💭';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-in slide-in-from-bottom duration-500">
      {/* Inbox List */}
      <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 bg-white dark:bg-background-dark px-3 py-2 rounded-xl border border-slate-200 dark:border-border-dark">
            <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..." 
              className="bg-transparent border-none text-xs w-full focus:ring-0" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">chat_bubble</span>
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map(c => (
              <div 
                key={c.id} 
                onClick={() => setSelectedConversation(c)}
                className={`p-4 border-b border-slate-50 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all ${selectedConversation?.id === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex gap-4">
                  <div className="relative">
                    <img src={c.avatar} className="size-10 rounded-full shrink-0" alt="" />
                    {c.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold truncate dark:text-white">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        {getPlatformIcon(c.platform)} {c.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                  {c.unread && c.unread > 0 && (
                    <span className="size-5 bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">{c.unread}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={selectedConversation.avatar} className="size-9 rounded-full" alt="" />
                  {selectedConversation.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold dark:text-white">{selectedConversation.name}</h3>
                  <p className={`text-[10px] font-bold flex items-center gap-1 ${selectedConversation.isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className={`size-1.5 rounded-full ${selectedConversation.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span> 
                    {selectedConversation.isOnline ? 'Active Now' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold uppercase">{selectedConversation.platform}</span>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors" title="User Info"><span className="material-symbols-outlined">info</span></button>
              </div>
            </div>
            
            <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/30 dark:bg-background-dark/20 no-scrollbar">
               <div className="flex flex-col gap-4">
                 {messages.map(msg => (
                   <div key={msg.id} className={`${msg.isOutgoing ? 'self-end' : 'self-start'} max-w-[70%]`}>
                     <div className={`p-3 rounded-2xl text-sm ${msg.isOutgoing 
                       ? 'bg-primary text-background-dark rounded-tr-none shadow-lg shadow-primary/20 font-medium' 
                       : 'bg-white dark:bg-surface-dark rounded-tl-none border border-slate-200 dark:border-border-dark shadow-sm dark:text-slate-300'}`}>
                       {msg.content}
                     </div>
                     <span className={`text-[10px] text-slate-400 mt-1 block ${msg.isOutgoing ? 'text-right' : 'text-left'}`}>
                       {msg.timestamp}
                     </span>
                   </div>
                 ))}
               </div>
            </div>

            <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-border-dark">
              <form onSubmit={(e) => {e.preventDefault(); handleSend();}} className="flex items-center gap-3 bg-slate-50 dark:bg-background-dark px-4 py-2 rounded-xl border border-slate-200 dark:border-border-dark">
                <button type="button" className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">add_circle</span></button>
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0" 
                />
                <button type="submit" className="text-primary disabled:opacity-50" disabled={!message.trim()}>
                  <span className="material-symbols-outlined font-black">send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-4">chat</span>
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientConversations;
