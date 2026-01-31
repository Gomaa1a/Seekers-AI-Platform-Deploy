
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { authService } from '../src/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({ token, password });
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-background-dark to-[#4F46E5] opacity-90"></div>
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-primary/30 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-emerald-500/25 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 w-full flex flex-col items-center justify-center p-16">
            <div className="animate-fadeIn">
              <Logo size={300} showText={false} animate={true} />
            </div>
          </div>
        </div>

        {/* Right Panel: Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
          <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-right duration-700">
            <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-black dark:text-white tracking-tight">
                Password Reset!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Your password has been successfully reset. You'll be redirected to the login page shortly.
              </p>
            </div>

            <div className="pt-4">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors"
              >
                <span className="material-symbols-outlined">login</span>
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-background-dark to-[#4F46E5] opacity-90"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        
        <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-primary/30 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-indigo-500/25 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
        
        <div className="relative z-10 w-full flex flex-col items-center justify-center p-16">
          <div className="animate-fadeIn">
            <Logo size={300} showText={false} animate={true} />
          </div>

          <div className="mt-12 text-center animate-slideIn" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
                Create New Password
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Choose a strong password for your account
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-right duration-700">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-black dark:text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mt-4">
              // NEW CREDENTIALS
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-sm text-red-500 font-bold">{error}</p>
            </div>
          )}

          {!token ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">Invalid or expired reset link.</p>
              <Link 
                to="/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 pr-12 bg-slate-100 dark:bg-surface-dark border-2 border-transparent focus:border-primary rounded-2xl text-base outline-none transition-all placeholder:text-slate-400 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                  Confirm Password
                </label>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-100 dark:bg-surface-dark border-2 border-transparent focus:border-primary rounded-2xl text-base outline-none transition-all placeholder:text-slate-400 dark:text-white"
                />
              </div>

              {/* Password Requirements */}
              <div className="p-4 bg-slate-100 dark:bg-surface-dark rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                  Password Requirements
                </p>
                <ul className="space-y-1.5 text-xs">
                  <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {/[a-z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {/[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    One number
                  </li>
                </ul>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="size-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center">
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
