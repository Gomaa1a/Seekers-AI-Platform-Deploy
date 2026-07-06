
import React, { useState, useEffect, useRef } from 'react';
import {
  conversationsService,
  ConversationSummary,
  ConversationMessage,
} from '../src/api/services/conversations';

const POLL_MS = 10000;

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function displayName(c: ConversationSummary): string {
  if (c.customer_name) return c.customer_name;
  return c.platform === 'instagram' ? 'Instagram user' : 'Facebook user';
}

const Avatar: React.FC<{ conversation: ConversationSummary; sizeClass?: string }> = ({
  conversation,
  sizeClass = 'size-10',
}) => {
  if (conversation.customer_profile_pic) {
    return (
      <img
        src={conversation.customer_profile_pic}
        className={`${sizeClass} rounded-full shrink-0 object-cover`}
        alt=""
      />
    );
  }
  const initial = displayName(conversation).charAt(0).toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded-full shrink-0 bg-primary/15 text-primary font-bold flex items-center justify-center`}
    >
      {initial}
    </div>
  );
};

const ClientConversations: React.FC = () => {
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dm' | 'comment'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const fetchConversations = async (selectFirst: boolean) => {
    try {
      const items = await conversationsService.list();
      setConversations(items);
      if (selectFirst && items.length > 0) {
        setSelectedId((prev) => prev || items[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const items = await conversationsService.messages(conversationId);
      setMessages(items);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    }
  };

  // Initial load + light polling so live chats appear without a refresh
  useEffect(() => {
    fetchConversations(true);
    const interval = setInterval(() => {
      fetchConversations(false);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId);
    const interval = setInterval(() => fetchMessages(selectedId), POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!message.trim() || !selectedId || isSending) return;
    const text = message.trim();
    setIsSending(true);
    setSendError(null);
    try {
      const sent = await conversationsService.send(selectedId, text);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
      }
      setMessage('');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      setSendError(apiError || 'Failed to send — the 24h reply window may have closed.');
    } finally {
      setIsSending(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return '📸';
      case 'facebook':
        return '💬';
      default:
        return '💭';
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      (typeFilter === 'all' || (c.conversation_type || 'dm') === typeFilter) &&
      (displayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase()))
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
        <div className="p-4 border-b border-slate-100 dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
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
          <div className="flex gap-1">
            {([
              ['all', 'All'],
              ['dm', 'Messages'],
              ['comment', 'Comments'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                  typeFilter === value
                    ? 'bg-primary text-background-dark'
                    : 'bg-white dark:bg-background-dark text-slate-500 border border-slate-200 dark:border-border-dark hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2">chat_bubble</span>
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">
                Chats appear here as soon as customers message your connected accounts.
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`p-4 border-b border-slate-50 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all ${selectedId === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex gap-4">
                  <Avatar conversation={c} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold truncate dark:text-white flex items-center gap-1.5">
                        {displayName(c)}
                        {c.conversation_type === 'comment' && (
                          <span className="text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                            Comment
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        {getPlatformIcon(c.platform)} {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.last_message_direction === 'outbound' ? 'You: ' : ''}
                      {c.last_message || 'No messages yet'}
                    </p>
                  </div>
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
                <Avatar conversation={selectedConversation} sizeClass="size-9" />
                <div>
                  <h3 className="text-sm font-bold dark:text-white">{displayName(selectedConversation)}</h3>
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    {selectedConversation.message_count} messages · started{' '}
                    {timeAgo(selectedConversation.started_at)} ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedConversation.conversation_type === 'comment' && (
                  <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
                    Comment thread
                  </span>
                )}
                <span className="text-xs text-slate-400 font-bold uppercase">{selectedConversation.platform}</span>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/30 dark:bg-background-dark/20 no-scrollbar">
              <div className="flex flex-col gap-4">
                {messages.map((msg) => {
                  const isOutgoing = msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`${isOutgoing ? 'self-end' : 'self-start'} max-w-[70%]`}>
                      <div
                        className={`p-3 rounded-2xl text-sm ${
                          isOutgoing
                            ? 'bg-primary text-background-dark rounded-tr-none shadow-lg shadow-primary/20 font-medium'
                            : 'bg-white dark:bg-surface-dark rounded-tl-none border border-slate-200 dark:border-border-dark shadow-sm dark:text-slate-300'
                        }`}
                      >
                        {msg.content || <em className="opacity-60">[{msg.message_type}]</em>}
                      </div>
                      <span
                        className={`text-[10px] text-slate-400 mt-1 block ${isOutgoing ? 'text-right' : 'text-left'}`}
                      >
                        {isOutgoing && msg.handled_by ? `${msg.handled_by === 'ai' ? 'AI' : 'You'} · ` : ''}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-border-dark">
              {sendError && (
                <p className="text-xs text-red-500 mb-2 px-1">{sendError}</p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-3 bg-slate-50 dark:bg-background-dark px-4 py-2 rounded-xl border border-slate-200 dark:border-border-dark"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    selectedConversation.conversation_type === 'comment'
                      ? 'Reply publicly to this comment...'
                      : 'Reply as a human agent...'
                  }
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0"
                />
                <button
                  type="submit"
                  className="text-primary disabled:opacity-50"
                  disabled={!message.trim() || isSending}
                >
                  <span className={`material-symbols-outlined font-black ${isSending ? 'animate-pulse' : ''}`}>
                    send
                  </span>
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
