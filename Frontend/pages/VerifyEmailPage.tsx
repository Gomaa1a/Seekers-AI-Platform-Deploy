
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { authService } from '../src/api';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend verification state
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setIsLoading(false);
      setShowResendForm(true);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authService.verifyEmail(verificationToken);
      setIsVerified(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. The link may have expired.');
      setShowResendForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setError(null);

    try {
      await authService.resendVerification(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center space-y-6 animate-pulse">
          <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Verifying your email...</h2>
            <p className="text-slate-500 mt-2">Please wait while we verify your account.</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isVerified) {
    return (
      <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-background-dark to-[#10B981] opacity-90"></div>
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-emerald-500/30 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-primary/25 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
          
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
              <span className="material-symbols-outlined text-4xl text-emerald-500">verified</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-black dark:text-white tracking-tight">
                Email Verified!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Your email has been successfully verified. You can now access all features of your account.
              </p>
            </div>

            <div className="pt-4">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors"
              >
                <span className="material-symbols-outlined">login</span>
                Continue to Login
              </Link>
            </div>

            <p className="text-xs text-slate-400">
              Redirecting to login in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Resend success state
  if (resendSuccess) {
    return (
      <div className="min-h-screen flex bg-background-light dark:bg-background-dark">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] via-background-dark to-[#4F46E5] opacity-90"></div>
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <div className="absolute top-[15%] left-[10%] w-[300px] h-[300px] bg-primary/30 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute bottom-[20%] right-[15%] w-[250px] h-[250px] bg-indigo-500/25 rounded-full blur-[80px] animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 w-full flex flex-col items-center justify-center p-16">
            <div className="animate-fadeIn">
              <Logo size={300} showText={false} animate={true} />
            </div>
          </div>
        </div>

        {/* Right Panel: Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
          <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-right duration-700">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary">mark_email_read</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-black dark:text-white tracking-tight">
                Check Your Email
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                If an unverified account exists for <span className="font-bold text-primary">{email}</span>, 
                you'll receive a new verification link.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <button
                onClick={() => {
                  setResendSuccess(false);
                  setEmail('');
                }}
                className="text-primary font-bold text-sm hover:underline"
              >
                Try another email
              </button>
            </div>

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
    );
  }

  // Error/Resend form state
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
                Email Verification
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Verify your email to unlock all features
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-right duration-700">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-black dark:text-white tracking-tight">
              Verify Email
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mt-4">
              // ACCOUNT VERIFICATION
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
              <div>
                <p className="text-sm text-red-500 font-bold">{error}</p>
                <p className="text-xs text-red-400 mt-1">
                  Request a new verification link below.
                </p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleResendVerification}>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                Email Address
              </label>
              <input 
                type="email" 
                placeholder="name@organization.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-100 dark:bg-surface-dark border-2 border-transparent focus:border-primary rounded-2xl text-base outline-none transition-all placeholder:text-slate-400 dark:text-white"
              />
            </div>

            <button 
              type="submit"
              disabled={isResending}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <div className="size-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  Resend Verification Link
                </>
              )}
            </button>
          </form>

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

export default VerifyEmailPage;
