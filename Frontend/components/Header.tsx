
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../src/context/AuthContext';

interface HeaderProps {
  isAdmin: boolean;
  onMenuToggle?: () => void;
}

// Simplified notification display (full context can be added via NotificationProvider)
interface SimpleNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Mock notifications - in production, use NotificationContext
  const [notifications] = useState<SimpleNotification[]>([
    { id: '1', title: 'Workflow Approved', message: 'Your automation request has been approved.', is_read: false, created_at: new Date().toISOString() },
    { id: '2', title: 'New Feature', message: 'Check out the new analytics dashboard!', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Scroll direction detection for hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        // Always show header near top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };
  return (
    <div className={`fixed top-4 md:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-7xl z-[100] px-2 md:px-4 transition-transform duration-500 ${isVisible ? 'translate-y-0' : '-translate-y-[200%]'}`}>
      <header className="h-20 md:h-28 flex items-center justify-between px-4 md:px-10 bg-white/70 dark:bg-surface-dark/80 backdrop-blur-3xl border border-slate-200 dark:border-border-dark rounded-2xl md:rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] transition-all">
        <div className="flex flex-1 items-center gap-2 md:gap-10">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-3xl">menu</span>
          </button>

          {/* Logo Scaling - Enlarged: 80px mobile / 140px desktop */}
          <div className="flex items-center">
            <Logo size={window.innerWidth < 768 ? 80 : 140} showText={false} className="!items-start" />
          </div>

          {/* Search Bar - Hidden on small mobile, with enlarged text */}
          <div className="hidden sm:flex w-full max-w-lg items-center bg-slate-100/50 dark:bg-background-dark/50 px-4 md:px-6 py-2.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200/50 dark:border-border-dark/50 group focus-within:ring-4 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-slate-400 text-2xl md:text-3xl group-focus-within:text-primary transition-colors">search</span>
            <input 
              type="text" 
              placeholder={isAdmin ? "Search global clusters..." : "Search docs..."}
              className="bg-transparent border-none focus:ring-0 text-sm md:text-base w-full dark:text-white placeholder:text-slate-400 px-2 md:px-4 font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-10">
          <div className="flex items-center gap-2 md:gap-6">
            {/* Notifications Dropdown - Enlarged icons */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 md:p-4 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all hover:scale-110 active:scale-95 border border-transparent"
              >
                <span className="material-symbols-outlined text-3xl md:text-4xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-2 md:top-4 right-2 md:right-4 size-2.5 md:size-3 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-border-dark flex justify-between items-center">
                    <h3 className="font-black text-sm dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">notifications_off</span>
                        <p className="text-sm text-slate-400">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          className={`p-4 border-b border-slate-50 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${!notif.is_read ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`size-2 rounded-full mt-2 ${!notif.is_read ? 'bg-primary' : 'bg-slate-300'}`} />
                            <div className="flex-1">
                              <p className="text-sm font-bold dark:text-white">{notif.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                              <p className="text-[10px] text-slate-400 mt-2">{formatTimeAgo(notif.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-100 dark:border-border-dark">
                    <button 
                      onClick={() => { setShowNotifications(false); navigate('/settings'); }}
                      className="w-full text-center text-xs font-bold text-primary hover:underline"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/settings')}
              className="hidden xs:block p-2 md:p-4 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all hover:scale-110 active:scale-95 border border-transparent"
            >
              <span className="material-symbols-outlined text-3xl md:text-4xl">settings</span>
            </button>
          </div>

          <div className="h-10 md:h-12 w-px bg-slate-200 dark:bg-border-dark mx-1 md:mx-2"></div>

          {/* User Menu Dropdown */}
          <div className="flex items-center gap-3 md:gap-4 relative" ref={userMenuRef}>
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-black px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg uppercase tracking-widest border border-emerald-500/20 shadow-sm">Live System</span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 opacity-60">
                {user?.email ? user.email.slice(0, 20) : 'ID: US-EAST-1A'}
              </p>
            </div>
            <div 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="size-10 md:size-16 rounded-xl md:rounded-2xl border-2 border-primary/20 bg-cover bg-center cursor-pointer hover:border-primary hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10 flex items-center justify-center bg-primary/10"
              style={{ backgroundImage: user?.avatar ? `url(${user.avatar})` : undefined }}
            >
              {!user?.avatar && (
                <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">person</span>
              )}
            </div>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 dark:border-border-dark">
                  <p className="font-bold text-sm dark:text-white truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                    Profile Settings
                  </button>
                  <button 
                    onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                    Settings
                  </button>
                  <div className="border-t border-slate-100 dark:border-border-dark my-2"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
