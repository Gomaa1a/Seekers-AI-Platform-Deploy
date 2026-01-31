
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../src/context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, adminLogin, isLoading, error, clearError, isAuthenticated, isAdmin: isAdminUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdminUser ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isAdminUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      if (isAdminMode) {
        await adminLogin({ email, password });
        navigate('/admin');
      } else {
        await login({ email, password });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  // Demo mode handlers (for testing without backend)
  const handleDemoLogin = async (asAdmin: boolean) => {
    setLocalError(null);
    clearError();
    
    try {
      if (asAdmin) {
        // Try admin login with demo credentials
        await adminLogin({ email: 'admin@seekersai.org', password: 'admin123' });
        navigate('/admin');
      } else {
        // Try client login with demo credentials
        await login({ email: 'demo@client.com', password: 'demo123' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLocalError('Demo mode: Backend not available. Please start the backend server.');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
      {/* Left Panel: Redesigned with floating gradient orbs and centered logo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-background-dark to-[#4F46E5] opacity-90"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        
        {/* Animated Floating Gradient Orbs */}
        <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-primary/30 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-indigo-500/25 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
        
        <div className="relative z-10 w-full flex flex-col items-center justify-center p-16">
          {/* Centered Animated Logo - 300px */}
          <div className="animate-fadeIn">
            <Logo size={300} showText={false} animate={true} />
          </div>

          {/* Single Tagline with gradient text */}
          <div className="mt-12 text-center animate-slideIn" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
                Intelligent Automation
              </span>
            </h2>
            <p className="mt-4 text-2xl md:text-3xl font-bold text-white/90 tracking-tight">
              for the Modern Enterprise
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-12 animate-in fade-in slide-in-from-right duration-700">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-black dark:text-white tracking-tight">
              {isAdminMode ? 'Admin Console' : 'Enterprise Login'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mt-4">
              // {isAdminMode ? 'PLATFORM ADMINISTRATION' : 'SECURE ACCESS CONSOLE'}
            </p>
          </div>

          {/* Admin/Client Toggle */}
          <div className="flex bg-slate-100 dark:bg-surface-dark p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsAdminMode(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !isAdminMode 
                  ? 'bg-primary text-background-dark shadow-lg' 
                  : 'text-slate-500 hover:text-primary'
              }`}
            >
              Client Portal
            </button>
            <button
              type="button"
              onClick={() => setIsAdminMode(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isAdminMode 
                  ? 'bg-amber-500 text-background-dark shadow-lg' 
                  : 'text-slate-500 hover:text-amber-500'
              }`}
            >
              Admin Console
            </button>
          </div>

          {/* Error Display */}
          {displayError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-sm text-red-500 font-bold">{displayError}</p>
            </div>
          )}

          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                {isAdminMode ? 'Admin Email' : 'Corporate Email'}
              </label>
              <input 
                type="email" 
                placeholder={isAdminMode ? 'admin@seekersai.org' : 'name@organization.com'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-2xl px-8 py-5 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm outline-none dark:text-white disabled:opacity-50"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Security Key</label>
                <Link to="#" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Forgot Access?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white dark:bg-surface-dark border-slate-200 dark:border-border-dark rounded-2xl px-8 py-5 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm outline-none dark:text-white disabled:opacity-50"
              />
            </div>
            
            <div className="flex items-center gap-3 px-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-primary focus:ring-primary border-slate-300 dark:border-border-dark dark:bg-background-dark size-4" 
              />
              <label htmlFor="remember" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">Maintain Session Persistence</label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-6 text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdminMode 
                  ? 'bg-amber-500 text-background-dark shadow-amber-500/20' 
                  : 'bg-primary text-background-dark shadow-primary/20'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="size-5 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isAdminMode ? 'Access Admin Panel' : 'Authorize Sign In'}
                  <span className="material-symbols-outlined font-black">login</span>
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-border-dark"></div></div>
             <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em] text-slate-400"><span className="bg-background-light dark:bg-background-dark px-6">Demo Sandbox</span></div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => handleDemoLogin(false)}
              disabled={isLoading}
              className="py-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all shadow-sm dark:text-white disabled:opacity-50"
            >
              Client Demo
            </button>
            <button 
              onClick={() => handleDemoLogin(true)}
              disabled={isLoading}
              className="py-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-amber-500 transition-all shadow-sm dark:text-white disabled:opacity-50"
            >
              Admin Demo
            </button>
          </div>

          <p className="text-center text-xs font-black text-slate-500 uppercase tracking-widest">
            Identity missing? <Link to="/register" className="text-primary hover:underline">Provision Organization</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
