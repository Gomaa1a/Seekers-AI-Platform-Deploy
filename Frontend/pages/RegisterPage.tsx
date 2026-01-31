
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../src/context/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState('E-commerce');
  const [customIndustry, setCustomIndustry] = useState('');
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);
  const [isRequirementView, setIsRequirementView] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    phone: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const steps = [
    { id: 1, name: 'Account', icon: 'person' },
    { id: 2, name: 'Org', icon: 'corporate_fare' },
    { id: 3, name: 'Focus', icon: 'interests' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setLocalError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return false;
    }
    // Check for uppercase, lowercase, and number
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setLocalError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.organizationName.trim()) {
      setLocalError('Please enter your organization name');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setLocalError(null);
    clearError();

    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    setStep(step + 1);
  };

  const handleFocusSelection = async (focusTitle: string) => {
    setSelectedFocus(focusTitle);
    setLocalError(null);
    clearError();
    
    // If complex focus is chosen, route to detailed description
    if (['Process Automation', 'Finance & Invoicing', 'Customized Agentic Application'].includes(focusTitle)) {
      setIsRequirementView(true);
    } else {
      // For simple chatbot support, register and proceed to onboarding
      try {
        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || undefined,
          organization: {
            name: formData.organizationName,
            industry: industry === 'Other' ? customIndustry : industry,
          },
        });
        navigate('/onboarding');
      } catch (err: any) {
        setLocalError(err.message || 'Registration failed. Please try again.');
      }
    }
  };

  const handleRequirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSubmissionSuccess(true);
  };

  const displayError = localError || error;

  if (showSubmissionSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full presentation-card rounded-[3rem] p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl font-black">verified</span>
          </div>
          <h2 className="text-3xl font-black dark:text-white">Submission Received</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Thank you for sharing your project vision. Someone from our team will email you as soon as possible to show you an MVP for your submission.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-5 bg-primary text-background-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:brightness-110 transition-all"
          >
            Back to Portal
          </button>
        </div>
      </div>
    );
  }

  if (isRequirementView) {
    return (
      <div className="min-h-screen flex flex-col p-8 md:p-16">
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
          {/* Enlarged logo for requirement view (160px) */}
          <Logo size={160} showText={false} className="mb-12" />
          <div className="w-full max-w-2xl text-center mb-10">
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">Project Scoping</p>
            <h1 className="text-4xl font-extrabold tracking-tight">Tell us about your project</h1>
            <p className="text-slate-500 mt-4 font-medium uppercase text-[10px] tracking-widest">Designing for focus: {selectedFocus}</p>
          </div>
          
          <div className="w-full max-w-2xl presentation-card rounded-[3rem] p-10 md:p-16">
            <form onSubmit={handleRequirementSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Project Description</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                  placeholder="What should this automation/agent achieve?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Target Users</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                  placeholder="Who are the main users of this solution?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Preferred Integrations (Optional)</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                  placeholder="CRM, ERP, WhatsApp, etc."
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 bg-primary text-background-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Submit Project Requirements
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-8 md:p-16">
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
        {/* Enlarged registration logo per request (160px) */}
        <Logo size={160} showText={false} className="mb-12" />
        
        <div className="w-full max-w-xl text-center mb-16">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">ONBOARDING SEQUENCE</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Build the Future Together</h1>
        </div>

        {/* Progress Tracker */}
        <div className="w-full max-w-md mb-16 flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 -z-10"></div>
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
              <div className={`size-12 rounded-full flex items-center justify-center transition-all duration-500 ring-8 ring-background-dark ${step >= s.id ? 'bg-primary text-background-dark shadow-[0_0_15px_rgba(161,158,255,0.4)]' : 'bg-white/5 text-slate-500'}`}>
                <span className="material-symbols-outlined text-xl font-black">{s.icon}</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.id ? 'text-primary' : 'text-slate-500'}`}>{s.name}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="w-full max-w-xl presentation-card rounded-[3rem] p-10 md:p-16">
          {step === 1 && (
            <div className="space-y-8">
              {/* Error Display */}
              {displayError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-500 font-bold">{displayError}</p>
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identity Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="Enter Full Name" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Corporate Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="Email Address" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Security Key</label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="Min 8 characters" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Security Key</label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="Repeat password" 
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              {/* Error Display */}
              {displayError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <p className="text-sm text-red-500 font-bold">{displayError}</p>
                </div>
              )}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Organization Label</label>
                  <input 
                    type="text" 
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="Company Name" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contact Phone (Optional)</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                    placeholder="+20 123 456 7890" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Industry Sector</label>
                  <div className="space-y-4">
                    <select 
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none appearance-none"
                    >
                      <option className="bg-surface-dark" value="E-commerce">E-commerce</option>
                      <option className="bg-surface-dark" value="Education">Education</option>
                      <option className="bg-surface-dark" value="Healthcare">Healthcare</option>
                      <option className="bg-surface-dark" value="Finance">Finance</option>
                      <option className="bg-surface-dark" value="Other">Other</option>
                    </select>
                    
                    {industry === 'Other' && (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <input 
                          type="text" 
                          value={customIndustry}
                          onChange={(e) => setCustomIndustry(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary transition-all outline-none" 
                          placeholder="Type in your sector..." 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: 'Chatbots & Support', sub: '24/7 Agentic customer success' },
                  { title: 'Process Automation', sub: 'Streamline backend workflows' },
                  { title: 'Finance & Invoicing', sub: 'Cash flow management logic' },
                  { title: 'Customized Agentic Application', sub: 'Bespoke AI solutions built to your spec' },
                ].map(item => (
                  <button 
                    key={item.title} 
                    onClick={() => handleFocusSelection(item.title)}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left hover:border-primary transition-all group"
                  >
                    <p className="text-sm font-black uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 flex flex-col gap-4">
            {step < 3 && (
              <button 
                onClick={handleNextStep}
                disabled={isLoading}
                className="w-full py-5 bg-primary text-background-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Continue Step'}
              </button>
            )}
            {step > 1 && step < 3 && (
              <button 
                onClick={() => { setStep(step - 1); setLocalError(null); }}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all"
              >
                Go Back
              </button>
            )}
            <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Already have a portal account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
