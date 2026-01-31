
import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import Modal from './Modal';

interface SidebarProps {
  isAdmin: boolean;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface SidebarLinkItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isAdmin, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  const clientLinks: SidebarLinkItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: 'grid_view' },
    { name: 'Knowledge Bases', path: '/knowledge-bases', icon: 'database' },
    { name: 'Workflow Requests', path: '/workflows/new', icon: 'account_tree' },
    { name: 'Add-ons', path: '/addons', icon: 'extension' },
    { name: 'Connected Accounts', path: '/accounts', icon: 'link' },
    { name: 'Conversations', path: '/conversations', icon: 'forum' },
    { name: 'Analytics', path: '/analytics', icon: 'bar_chart' },
    { name: 'Settings', path: '/settings', icon: 'settings' },
  ];

  const adminLinks: SidebarLinkItem[] = [
    { name: 'Admin Dashboard', path: '/admin', icon: 'dashboard' },
    { name: 'All Clients', path: '/admin/clients', icon: 'group' },
    { name: 'Workflow Requests', path: '/admin/requests', icon: 'alt_route', badge: '12' },
    { name: 'System Workflows', path: '/admin/system-workflows', icon: 'account_tree' },
    { name: 'Platform Analytics', path: '/admin/platform-analytics', icon: 'monitoring' },
    { name: 'Global Settings', path: '/admin/settings', icon: 'settings' },
  ];

  const links = isAdmin ? adminLinks : clientLinks;

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark overflow-hidden">
      <div className="p-8 md:p-10 flex flex-col items-center">
        <Logo size={160} showText={false} />
        <div className="mt-4 flex flex-col items-center">
          <div className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            isAdmin ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
          }`}>
            {isAdmin ? 'Platform Admin' : 'Tenant Console'}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 mt-2 space-y-1 overflow-y-auto no-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-300 group
              ${isActive
                ? 'bg-primary text-background-dark font-black shadow-lg shadow-primary/20 scale-[1.02]' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-bold'}
            `}
          >
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">
              {link.icon}
            </span>
            <span className="text-sm tracking-tight whitespace-nowrap">{link.name}</span>
            {link.badge && (
              <span className="ml-auto bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-black animate-pulse">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-border-dark space-y-4">
        <Link 
          to="/profile"
          className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
        >
          <div className="size-10 rounded-full border-2 border-primary/20 bg-cover bg-center shadow-lg group-hover:border-primary transition-colors shrink-0" style={{ backgroundImage: 'url(https://picsum.photos/200?random=admin)' }} />
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-sm font-black dark:text-white truncate">Alex Thompson</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Enterprise Lead</p>
          </div>
        </Link>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setIsSupportOpen(true)}
            className="py-3 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-xl flex items-center justify-center text-slate-500 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined">help_center</span>
          </button>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="py-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed h-full border-r border-slate-200 dark:border-border-dark z-50">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div 
        className={`fixed inset-0 z-[200] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className={`absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-surface-dark transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {SidebarContent}
        </div>
      </div>

      {/* Popups */}
      <Modal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Enterprise Support">
        <div className="space-y-6">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Your organization has dedicated 24/7 priority support enabled. Connect with your handler instantly.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button className="w-full py-4 bg-primary text-background-dark rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined">chat_bubble</span> Launch Live Concierge
            </button>
            <button className="w-full py-4 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-2xl font-black text-sm uppercase tracking-widest dark:text-white hover:border-primary transition-all">
              Submit Priority Ticket
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Confirm Session End">
        <div className="space-y-6 text-center">
          <p className="text-sm text-slate-500 font-medium">Are you sure you want to end your current session?</p>
          <div className="flex gap-4">
            <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-background-dark rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500">Cancel</button>
            <button onClick={handleLogout} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">Sign Out</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;
