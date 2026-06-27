
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const LandingPage: React.FC = () => {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [billingYearly, setBillingYearly] = useState(false);

  // Scroll direction detection for hide/show nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) setIsNavVisible(true);
      else if (currentScrollY > lastScrollY && currentScrollY > 100) setIsNavVisible(false);
      else if (currentScrollY < lastScrollY) setIsNavVisible(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features = [
    { title: 'Replies in seconds', icon: 'bolt', desc: 'Your agent answers customers instantly, 24/7 — no queues, no waiting, no missed messages.' },
    { title: 'Every channel, one brain', icon: 'hub', desc: 'Facebook, Instagram, WhatsApp and your website — connected to a single agent that knows your business.' },
    { title: 'You stay in control', icon: 'tune', desc: 'Set the tone, train it on your own knowledge, and hand off to a human the moment it matters.' },
    { title: 'Understands people', icon: 'psychology', desc: 'Detects emotion and mood, calms unhappy customers, and extracts leads from every conversation.' },
  ];

  const signature = [
    { title: 'Emotion & mood detection', icon: 'mood', desc: 'Senses frustration and adapts its tone — and flags unsatisfied chats for you.' },
    { title: 'Smart escalation', icon: 'support_agent', desc: 'Handles routine questions and routes the complex ones to a human, with full context.' },
    { title: 'Lead extraction', icon: 'person_search', desc: 'Spots potential customers in conversations and captures them for your sales team.' },
  ];

  const steps = [
    { step: '01', title: 'Create your agent', icon: 'smart_toy', desc: 'Name it, pick a tone, tell it what your business does. Takes about a minute.' },
    { step: '02', title: 'Add your knowledge', icon: 'menu_book', desc: 'Paste your FAQs, policies, or product info. Your agent learns instantly.' },
    { step: '03', title: 'Connect a channel', icon: 'link', desc: 'Link Facebook, Instagram, WhatsApp, or your website in a couple of clicks.' },
    { step: '04', title: 'Go live', icon: 'rocket_launch', desc: 'Flip the switch. Your agent starts answering customers right away.' },
  ];

  const monthly = { starter: 25, professional: 99 };
  const yearlyFactor = 10; // ~2 months free
  const price = (m: number) => (billingYearly ? Math.round((m * yearlyFactor) / 12) : m);

  const plans = [
    {
      name: 'Free', price: 0, blurb: 'Try it, no card needed',
      features: ['100 messages / month', '1 AI agent', '1 integration', 'Community support'],
      cta: 'Start Free', highlight: false,
    },
    {
      name: 'Starter', price: price(monthly.starter), blurb: 'For growing pages',
      features: ['1,000 messages / month', '1 AI agent', '2 integrations', 'Analytics & reporting', 'Email support'],
      cta: 'Start Free Trial', highlight: false,
    },
    {
      name: 'Professional', price: price(monthly.professional), blurb: 'Most popular',
      features: ['10,000 messages / month', '3 AI agents', 'Unlimited integrations', 'API access', 'Lead extraction', 'Priority support'],
      cta: 'Start Free Trial', highlight: true,
    },
    {
      name: 'Enterprise', price: null, blurb: 'For scale & teams',
      features: ['Custom message volume', 'Unlimited agents', 'API actions & webhooks', 'Dedicated success manager', 'SLA & onboarding'],
      cta: 'Contact Sales', highlight: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-primary/5 blur-[100px] md:blur-[150px] rounded-full animate-glow-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] bg-indigo-500/5 blur-[100px] md:blur-[150px] rounded-full animate-glow-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Floating Header Navigation */}
      <div className={`fixed top-4 md:top-8 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-7xl z-50 px-2 md:px-4 transition-transform duration-500 ${isNavVisible ? 'translate-y-0' : '-translate-y-[200%]'}`}>
        <nav className="h-20 md:h-24 flex items-center justify-between px-4 md:px-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center">
            <Logo size={window.innerWidth < 768 ? 110 : 170} showText={false} className="!items-start" />
          </div>
          <div className="hidden lg:flex items-center gap-12">
            {['Features', 'How it works', 'Pricing'].map((item) => {
              const id = item.toLowerCase().replace(/\s+/g, '-');
              return (
                <a key={item} href={`#${id}`} onClick={scrollToSection(id)}
                  className="text-[11px] font-black text-slate-300 hover:text-primary transition-all uppercase tracking-[0.4em] hover:scale-110 active:scale-95">
                  {item}
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <Link to="/login" className="hidden xs:block text-[11px] md:text-[12px] font-black text-slate-300 hover:text-primary transition-all uppercase tracking-[0.3em] px-3 md:px-6 py-3 rounded-xl hover:bg-white/5">Sign In</Link>
            <Link to="/register" className="px-5 md:px-10 py-3 md:py-5 bg-primary text-background-dark rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black shadow-[0_20px_40px_rgba(161,158,255,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center gap-2">
              Start Free
              <span className="material-symbols-outlined text-sm md:text-lg font-black">arrow_forward</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-44 md:pt-64 pb-20 md:pb-36 text-center relative z-10">
        <div className="flex flex-col items-center">
          <div className="space-y-6 md:space-y-8 max-w-5xl animate-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 mb-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] md:text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">AI Customer Support for the MENA Region</span>
            </div>
            <h1 className="text-4xl md:text-7xl lg:text-[7rem] font-extrabold tracking-tighter leading-[1.05]">
              Customer support <br />
              that feels <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 italic px-2">human</span>
            </h1>
            <p className="text-base md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
              Launch an AI agent that answers your customers in seconds across Facebook, Instagram, WhatsApp and your website — trained on your business, live in minutes.
            </p>
            <div className="pt-6 md:pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
              <Link to="/register" className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-7 bg-primary text-background-dark rounded-2xl text-sm md:text-lg font-black shadow-[0_30px_60px_rgba(161,158,255,0.5)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]">
                Start Free Trial
              </Link>
              <a href="#how-it-works" onClick={scrollToSection('how-it-works')} className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-7 bg-white/5 border border-white/10 text-white rounded-2xl text-sm md:text-lg font-black hover:bg-white/10 transition-all uppercase tracking-[0.2em]">
                See How It Works
              </a>
            </div>
            <p className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-[0.3em] pt-2">
              No credit card &nbsp;·&nbsp; No technical knowledge
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 md:py-28 relative z-10">
        <div className="text-center mb-12 md:mb-20">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">WHY TEAMS CHOOSE US</p>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">Everything your support needs <br className="hidden md:block" /> none of the work</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {features.map((item, idx) => (
            <div key={idx} className="presentation-card p-7 md:p-9 rounded-3xl group">
              <div className="size-14 md:size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/5">
                <span className="material-symbols-outlined text-3xl md:text-4xl font-black">{item.icon}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-3 tracking-tight">{item.title}</h3>
              <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Signature capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-6 md:mt-8">
          {signature.map((item, idx) => (
            <div key={idx} className="flex items-start gap-5 p-7 rounded-3xl bg-white/5 border border-white/10">
              <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl font-black">{item.icon}</span>
              </div>
              <div>
                <h4 className="text-lg font-black mb-1 tracking-tight">{item.title}</h4>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16 md:py-28 relative z-10 bg-white/5 rounded-[2rem] md:rounded-[4rem] border border-white/10 my-10">
        <div className="text-center mb-14 md:mb-20 px-4">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">LIVE IN 4 STEPS</p>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">From sign-up to live agent <br className="hidden md:block" /> in minutes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 px-4 md:px-10">
          {steps.map((item, idx) => (
            <div key={idx} className="relative text-center flex flex-col items-center">
              <div className="size-16 md:size-20 bg-primary/10 text-primary rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                <span className="material-symbols-outlined text-3xl md:text-4xl font-black">{item.icon}</span>
              </div>
              <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] mb-2">Step {item.step}</span>
              <h4 className="text-lg md:text-xl font-black mb-2 tracking-tight">{item.title}</h4>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-14">
          <Link to="/register" className="inline-flex px-12 py-5 bg-primary text-background-dark rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
            Build My Agent
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-16 md:py-28 relative z-10">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">SIMPLE PRICING</p>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">Start free. Scale when you grow.</h2>
          <div className="inline-flex items-center gap-1 mt-8 p-1.5 rounded-2xl bg-white/5 border border-white/10">
            <button onClick={() => setBillingYearly(false)} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${!billingYearly ? 'bg-primary text-background-dark' : 'text-slate-400'}`}>Monthly</button>
            <button onClick={() => setBillingYearly(true)} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${billingYearly ? 'bg-primary text-background-dark' : 'text-slate-400'}`}>Yearly · 2 months free</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 items-stretch">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative p-7 md:p-8 rounded-3xl flex flex-col ${plan.highlight ? 'bg-primary/10 border-2 border-primary shadow-[0_30px_80px_-20px_rgba(161,158,255,0.4)]' : 'presentation-card'}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-background-dark rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Most Popular</span>
              )}
              <h3 className="text-xl font-black tracking-tight mb-1">{plan.name}</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-5">{plan.blurb}</p>
              <div className="mb-6">
                {plan.price === null ? (
                  <span className="text-4xl font-extrabold tracking-tighter">Custom</span>
                ) : (
                  <>
                    <span className="text-5xl font-extrabold tracking-tighter">${plan.price}</span>
                    <span className="text-slate-400 font-bold text-sm">/mo</span>
                  </>
                )}
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                    <span className="material-symbols-outlined text-primary text-lg font-black shrink-0">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center transition-all ${plan.highlight ? 'bg-primary text-background-dark shadow-xl hover:scale-[1.03]' : 'bg-white/5 border border-white/10 text-white hover:border-primary'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA / Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10 border-t border-white/10">
        <div className="presentation-card rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-20 text-center flex flex-col items-center">
          <h2 className="text-3xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">Ready to never miss <br className="hidden md:block" /> a customer again?</h2>
          <p className="text-base md:text-xl text-slate-400 font-medium max-w-2xl leading-relaxed mb-10">
            Join businesses across the MENA region using Seekers AI to answer, qualify, and delight customers — automatically.
          </p>
          <Link to="/register" className="px-12 md:px-20 py-5 md:py-7 bg-primary text-background-dark rounded-2xl text-sm md:text-lg font-black uppercase tracking-[0.2em] shadow-[0_30px_60px_rgba(161,158,255,0.4)] hover:scale-105 active:scale-95 transition-all">
            Start Free Trial
          </Link>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mt-6">No credit card · Cancel anytime</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-8 mt-12 text-slate-500">
            <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">mail</span> Team@seekersai.org</span>
            <span className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">phone</span> 01044332566</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
