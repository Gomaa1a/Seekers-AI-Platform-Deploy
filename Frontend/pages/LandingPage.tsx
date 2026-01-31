
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Modal from '../components/Modal';

const LandingPage: React.FC = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Date/Time, 2: Details, 3: Success
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll direction detection for hide/show nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        // Always show nav near top
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide nav
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show nav
        setIsNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const timeSlots = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:30 PM"];

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStep(3);
  };

  const resetBooking = () => {
    setIsBookingModalOpen(false);
    setTimeout(() => {
      setBookingStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
    }, 300);
  };

  return (
    <div className="min-h-screen">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-primary/5 blur-[100px] md:blur-[150px] rounded-full animate-glow-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] bg-indigo-500/5 blur-[100px] md:blur-[150px] rounded-full animate-glow-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Floating Header Navigation with scroll-hide */}
      <div className={`fixed top-4 md:top-10 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-7xl z-50 px-2 md:px-4 transition-transform duration-500 ${isNavVisible ? 'translate-y-0' : '-translate-y-[200%]'}`}>
        <nav className="h-20 md:h-32 flex items-center justify-between px-4 md:px-12 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center">
             {/* Logo Scaling - Enlarged: 120px mobile / 240px desktop */}
             <Logo size={window.innerWidth < 768 ? 120 : 240} showText={false} className="!items-start" />
          </div>
          <div className="hidden lg:flex items-center gap-16">
            {['Solutions', 'Impact', 'Process', 'Trust'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                onClick={scrollToSection(item.toLowerCase())}
                className="text-[12px] font-black text-slate-300 hover:text-primary transition-all uppercase tracking-[0.5em] hover:scale-110 active:scale-95"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/login" className="hidden xs:block text-[11px] md:text-[12px] font-black text-slate-300 hover:text-primary transition-all uppercase tracking-[0.4em] px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl hover:bg-white/5">Portal</Link>
            <Link to="/register" className="px-5 md:px-12 py-3 md:py-6 bg-primary text-background-dark rounded-xl md:rounded-[2rem] text-[10px] md:text-sm font-black shadow-[0_20px_40px_rgba(161,158,255,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center gap-2 md:gap-4">
              Get Started
              <span className="material-symbols-outlined text-sm md:text-xl font-black">arrow_forward</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-48 md:pt-72 pb-24 md:pb-48 text-center relative z-10">
        <div className="flex flex-col items-center">
          <div className="space-y-6 md:space-y-10 max-w-6xl animate-in slide-in-from-bottom-12 duration-1000">
            <h1 className="text-4xl md:text-8xl lg:text-[8.5rem] font-extrabold tracking-tighter leading-[1.1] md:leading-[1.2] mb-4 md:mb-8 overflow-visible">
              Transform Your Business <br />
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 italic py-2 md:py-6 px-4">with Intelligent AI</span>
            </h1>
            <p className="text-[10px] md:text-xl text-slate-400 font-bold uppercase tracking-[0.4em] md:tracking-[0.6em] opacity-80 mb-8 md:mb-16">
              // NEXT-GEN AUTOMATION FOR THE MENA REGION
            </p>
            <div className="pt-8 md:pt-12 flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-12">
              <Link to="/register" className="w-full sm:w-auto px-10 md:px-20 py-5 md:py-8 bg-primary text-background-dark rounded-2xl md:rounded-[2.5rem] text-sm md:text-lg font-black shadow-[0_30px_60px_rgba(161,158,255,0.5)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.3em]">
                Deploy Solutions Now
              </Link>
              <div className="flex flex-col items-center gap-2 md:gap-4 opacity-40">
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em]">Cairo Headquarters</span>
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em]">Global Infrastructure</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Portfolio */}
      <section id="solutions" className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10">
        <div className="mb-12 md:mb-20">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">OUR SOLUTIONS PORTFOLIO</p>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">Comprehensive AI Solutions for <br className="hidden md:block" /> Modern Business</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {[
            { title: 'AI Chatbots & Customer Engagement', icon: 'chat_bubble', desc: 'Deploy intelligent agents that handle inquiries, qualify leads, and support sales 24/7. Never miss a customer interaction again.', tags: ['24/7 Support', 'Lead Gen', 'Multi-channel'] },
            { title: 'Intelligent Process Automation', icon: 'account_tree', desc: 'Streamline complex workflows by integrating your CRM and tools. Automate data entry, routing, and reporting to boost efficiency.', tags: ['CRM Integration', 'Workflow Ops', 'Zero Error'] },
            { title: 'Customized Agentic Application', icon: 'auto_awesome', desc: 'Imagine Creating A SAAS model with any feature’s connected to it’s infrastructure multiple AI Agents to control, answer and report to you.', tags: ['Cloud based', 'Multi-Agent', 'Secured'] },
            { title: 'Finance & Invoice Automation', icon: 'payments', desc: 'Take control of cash flow with automated invoice management, payment reminders, and real time financial insight generation.', tags: ['Analytics', 'Payment Tracking', 'Invoicing'] },
          ].map((item, idx) => (
            <div key={idx} className="presentation-card p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] group">
              <div className="size-16 md:size-20 bg-primary/10 text-primary rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-10 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/5">
                <span className="material-symbols-outlined text-3xl md:text-5xl font-black">{item.icon}</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-4 md:mb-6 tracking-tight">{item.title}</h3>
              <p className="text-slate-400 font-medium text-base md:text-xl leading-relaxed mb-6 md:mb-10">{item.desc}</p>
              <div className="flex flex-wrap gap-2 md:gap-4">
                {item.tags.map(tag => (
                  <span key={tag} className="px-3 md:px-5 py-1.5 md:py-2.5 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      
      {/* Impact Section */}
      <section id="impact" className="max-w-7xl mx-auto px-6 py-20 md:py-32 relative z-10 bg-white/5 rounded-[2rem] md:rounded-[4rem] border border-white/10 my-10 md:my-20">
        <div className="text-center mb-16 md:mb-24">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6">PROVEN ROI & IMPACT</p>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">Results That Scale Your Business</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 px-4 md:px-10">
          {[
            { val: '60%', label: 'Cost Reduction', desc: 'Lower operational expenses via workflow efficiency.', icon: 'payments' },
            { val: '70%', label: 'Faster Response', desc: 'Instant replies improving customer satisfaction.', icon: 'bolt' },
            { val: '5x', label: 'ROI in 6 Months', desc: 'Measurable return realized within two quarters.', icon: 'savings' },
            { val: '100%', label: 'Automation', desc: 'Eliminate manual repetitive enterprise tasks.', icon: 'autorenew' },
          ].map((item, idx) => (
            <div key={idx} className="presentation-card p-8 md:p-12 rounded-2xl md:rounded-[3rem] text-center flex flex-col items-center">
              <div className="size-12 md:size-16 bg-primary/10 text-primary rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-xl shadow-primary/5">
                <span className="material-symbols-outlined text-2xl md:text-3xl font-black">{item.icon}</span>
              </div>
              <p className="text-4xl md:text-6xl font-extrabold text-primary mb-2 md:mb-4 tracking-tighter">{item.val}</p>
              <h4 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] mb-4 md:mb-6">{item.label}</h4>
              <p className="text-[11px] md:text-sm text-slate-400 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="max-w-7xl mx-auto px-6 py-20 md:py-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="space-y-8 md:space-y-12">
            <div>
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">THE PROCESS</p>
              <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight leading-tight">From Strategy to Execution</h2>
            </div>
            <div className="space-y-6 md:space-y-8">
              {[
                { step: '01', title: 'Consultation', desc: 'We audit your current workflows and identify automation opportunities.' },
                { step: '02', title: 'Provisioning', desc: 'We configure your knowledge base and meta connections on the platform.' },
                { step: '03', title: 'Deployment', desc: 'Our engineers push your agentic workflows live to all social channels.' },
                { step: '04', title: 'Optimization', desc: 'Real-time monitoring and iterative training for maximum performance.' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 md:gap-8 items-start group">
                  <div className="text-3xl md:text-5xl font-black text-primary/20 group-hover:text-primary transition-colors leading-none">{item.step}</div>
                  <div>
                    <h4 className="text-lg md:text-2xl font-black mb-2 tracking-tight group-hover:text-white transition-colors">{item.title}</h4>
                    <p className="text-[12px] md:text-base text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer Contact */}
      <footer id="trust" className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
          <div className="lg:col-span-7 space-y-10 md:space-y-16">
            <div>
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6">LET'S START YOUR TRANSFORMATION</p>
              <h2 className="text-4xl md:text-8xl font-extrabold tracking-tight leading-tight">Ready to Transform Your Business?</h2>
            </div>
            <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl leading-relaxed">
              Join the leading companies in the MENA region using Seekers AI to automate, scale, and succeed.
            </p>
            <div className="space-y-8 md:space-y-12 pt-4 md:pt-8">
              <div className="flex gap-4 md:gap-8 items-start">
                <div className="size-12 md:size-20 rounded-xl md:rounded-3xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-2xl"><span className="material-symbols-outlined text-primary text-2xl md:text-4xl">mail</span></div>
                <div>
                  <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Corporate Correspondence</p>
                  <p className="text-xl md:text-3xl font-black text-white">Team@seekersai.org</p>
                </div>
              </div>
              <div className="flex gap-4 md:gap-8 items-start">
                <div className="size-12 md:size-20 rounded-xl md:rounded-3xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-2xl"><span className="material-symbols-outlined text-primary text-2xl md:text-4xl">phone</span></div>
                <div>
                  <p className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2">Priority Sales Channel</p>
                  <p className="text-xl md:text-3xl font-black text-white whitespace-nowrap">01044332566 | 01010748045</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="presentation-card p-8 md:p-14 rounded-3xl md:rounded-[4rem] text-center flex flex-col items-center">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[3rem] mb-8 md:mb-12 shadow-[0_30px_100px_rgba(255,255,255,0.1)]">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://seekersai.org" alt="QR Code" className="size-48 md:size-64" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 tracking-tight">Schedule Consultation</h3>
              <p className="text-base md:text-xl text-slate-400 font-medium mb-8 md:mb-12 leading-relaxed">Scan to book your free strategy session with our experts.</p>
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full py-5 md:py-8 bg-primary text-background-dark rounded-2xl md:rounded-[2rem] font-black text-sm md:text-xl uppercase tracking-widest shadow-3xl flex items-center justify-center gap-3 md:gap-5 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xl md:text-3xl font-black">event_available</span>
                Book My Session
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={resetBooking} 
        title={bookingStep === 3 ? "Confirmation" : "Schedule Strategy Session"}
      >
        <div className="space-y-6">
          {bookingStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Select a Date (October 2023)</p>
                <div className="grid grid-cols-7 gap-2">
                  {days.map(d => (
                    <button 
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`aspect-square rounded-xl text-xs font-black transition-all border ${
                        selectedDate === d ? 'bg-primary border-primary text-background-dark shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 border-white/10 text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Preferred Time Slot</p>
                <div className="grid grid-cols-2 gap-3">
                  {timeSlots.map(t => (
                    <button 
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        selectedTime === t ? 'bg-primary border-primary text-background-dark shadow-lg shadow-primary/20 scale-105' : 'bg-white/5 border-white/10 text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                disabled={!selectedDate || !selectedTime}
                /* Fixed: changed setStep to setBookingStep */
                onClick={() => setBookingStep(2)}
                className="w-full py-6 bg-primary text-background-dark rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                Proceed to Details
              </button>
            </div>
          )}

          {bookingStep === 2 && (
            <form onSubmit={handleBookingSubmit} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                  <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary outline-none transition-all" placeholder="Enter your name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Corporate Email</label>
                  <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary outline-none transition-all" placeholder="name@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
                  <input required type="tel" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary outline-none transition-all" placeholder="+20 123 456 7890" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Project Summary / Inquiry</label>
                  <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-primary outline-none transition-all" placeholder="Tell us briefly about your automation goals..." />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setBookingStep(1)} className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Back</button>
                <button type="submit" className="flex-1 py-5 bg-primary text-background-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Confirm Booking</button>
              </div>
            </form>
          )}

          {bookingStep === 3 && (
            <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 py-4">
              <div className="size-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <span className="material-symbols-outlined text-4xl font-black">check_circle</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Session Scheduled</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Your strategy session for <span className="text-primary font-bold">Oct {selectedDate} @ {selectedTime}</span> has been locked in. 
                  Check your inbox for the calendar invite.
                </p>
              </div>
              <button 
                onClick={resetBooking}
                className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-background-dark transition-all"
              >
                Close Portal
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LandingPage;
