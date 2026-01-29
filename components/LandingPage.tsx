import React, { useState } from 'react';
import { 
  LogIn, Video, Mic, Share2, Shield, FileText, 
  LifeBuoy, Sparkles, ChevronRight, PlayCircle, 
  MessageSquare, Smartphone, Lock, Globe, Zap,
  CheckCircle2, Mail, Info
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'support' | null>(null);

  const toggleTab = (tab: 'privacy' | 'terms' | 'support') => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  return (
    <div className="flex flex-col w-full bg-white text-gray-900 overflow-hidden font-sans">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-[100] border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-lg shadow-blue-600/20">eG</div>
            <span className="text-xl font-black tracking-tighter">eGreetz</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Studio</a>
            <a href="#footer" className="text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">Support</a>
          </div>
          <button 
            onClick={onLogin}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95"
          >
            <LogIn size={16} strokeWidth={2.5} /> Sign In with Google
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 px-6 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white -z-10" />
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-10 border border-blue-100/50 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles size={12} className="fill-blue-500/20" /> Hollywood Production Studio in your Pocket
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.95] max-w-5xl">
          Cinematic <span className="text-gradient">Greetings</span> <br /> 
          <span className="text-gray-400">Powered by Gemini.</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mb-14 leading-relaxed font-medium">
          Produce breathtaking video moments with expressive AI narration and 8K atmospheric visuals. No technical skills required.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button 
            onClick={onLogin}
            className="group relative flex items-center justify-center gap-4 px-12 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              <LogIn size={24} strokeWidth={3} /> Start Producing Now
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          </button>
          <div className="flex -space-x-3 items-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
              </div>
            ))}
            <span className="pl-6 text-sm font-bold text-gray-400 uppercase tracking-widest">+1k Creators</span>
          </div>
        </div>
      </section>

      {/* Feature 1: The Visuals (White Section) */}
      <section id="features" className="py-32 px-6 bg-white border-y border-gray-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-24 items-center">
          <div className="relative order-2 md:order-1">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-[3rem] blur-2xl -z-10 animate-pulse" />
            <div className="relative aspect-[4/3] bg-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 group">
              <img 
                src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1200" 
                alt="Cinematic Experience" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
              />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 text-white animate-bounce">
                  <PlayCircle size={40} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl">
                <p className="text-white font-black italic text-sm">"Happy Anniversary! Let's celebrate our journey together under the starlight."</p>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mt-2">AI Generated Scene: Galactic Ballroom</p>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <Video size={28} />
            </div>
            <h2 className="text-5xl font-black tracking-tight leading-[1.1]">Cinematography <br /><span className="text-blue-600">Reimagined.</span></h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              Powered by Google's Veo 3.1, eGreetz produces high-fidelity visuals previously only possible in Hollywood studios. Describe your scene, and our AI Director renders every photon.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Zap size={16} />, text: '8K HDR Lighting' },
                { icon: <Smartphone size={16} />, text: 'Dynamic Camera Work' },
                { icon: <Globe size={16} />, text: 'Atmospheric Effects' },
                { icon: <Lock size={16} />, text: 'Private Rendering' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                  <span className="text-blue-600">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Voice (Light Gray Section) */}
      <section className="py-32 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-24 items-center">
          <div className="space-y-8">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-600/20">
              <Mic size={28} />
            </div>
            <h2 className="text-5xl font-black tracking-tight leading-[1.1]">The Voice of <br /><span className="text-purple-600">Emotion.</span></h2>
            <p className="text-xl text-gray-500 leading-relaxed font-medium">
              Sync your visuals with warm, expressive AI narration. Our Gemini TTS engine captures the inflection and sincerity of human speech, making every word feel personal.
            </p>
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <PlayCircle size={24} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-xs text-blue-600">Male (Tenor)</h4>
                  <p className="text-sm font-bold text-gray-400">Warm, energetic, and celebratory.</p>
                </div>
              </div>
              <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <PlayCircle size={24} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-xs text-purple-600">Female</h4>
                  <p className="text-sm font-bold text-gray-400">Soft, sophisticated, and emotional.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute -inset-20 bg-purple-600/5 rounded-full blur-[100px] -z-10" />
            <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-8 bg-blue-600 rounded-full animate-[bounce_1s_infinite_0s]" />
                  <div className="w-2 h-12 bg-purple-600 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                  <div className="w-2 h-6 bg-pink-600 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                  <div className="w-2 h-14 bg-indigo-600 rounded-full animate-[bounce_1s_infinite_0.3s]" />
                  <div className="w-2 h-10 bg-blue-600 rounded-full animate-[bounce_1s_infinite_0.4s]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Voice Pipeline Ready</span>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-gray-50 rounded-full" />
                <div className="h-2 w-3/4 bg-gray-50 rounded-full" />
                <div className="h-2 w-1/2 bg-gray-50 rounded-full" />
              </div>
              <p className="text-gray-400 italic text-sm text-center font-medium">"Happy Birthday, Sarah! Have the most magical day."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Smart Sharing (White Section) */}
      <section id="how-it-works" className="py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex w-20 h-20 bg-green-50 rounded-3xl items-center justify-center text-green-600 mb-6 shadow-xl shadow-green-600/5 border border-green-100">
            <Share2 size={36} />
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">Share the Magic <br /><span className="text-green-600">Instantly.</span></h2>
          <p className="text-xl md:text-2xl text-gray-500 leading-relaxed font-medium">
            Our Short URL engine and native mobile integration make it effortless to blast your creations to any group chat or email.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 mb-6 shadow-sm">
                <Smartphone size={24} />
              </div>
              <h4 className="text-lg font-black mb-3">Group Blast</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">Integrated search to find your existing chat groups on iMessage, WhatsApp, and Telegram.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 mb-6 shadow-sm">
                <Globe size={24} />
              </div>
              <h4 className="text-lg font-black mb-3">Viewer Mode</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">Branded Short URLs allow your friends and family to watch your production with zero friction—no login required.</p>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 mb-6 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-lg font-black mb-3">Cloud Persistence</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">Every masterpiece you create is permanently stored in your private library for as long as you want.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action (Dark Section) */}
      <section className="py-24 px-6 bg-gray-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        <h2 className="text-5xl md:text-7xl font-black mb-10 tracking-tighter leading-tight">Your first production <br /> is waiting.</h2>
        <button 
          onClick={onLogin}
          className="group px-16 py-7 bg-white text-gray-900 rounded-[2.5rem] font-black text-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-2xl flex items-center gap-4 mx-auto"
        >
          <LogIn size={28} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" /> Sign In & Create
        </button>
      </section>

      {/* Professional Detailed Footer */}
      <footer id="footer" className="bg-white border-t border-gray-100 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="space-y-6 col-span-1 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-base">eG</div>
                <span className="text-2xl font-black tracking-tighter">eGreetz</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                The world's first cinematic AI production studio for personalized greetings. Making movie magic accessible to everyone.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors cursor-pointer border border-gray-100">
                  <Mail size={18} />
                </div>
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors cursor-pointer border border-gray-100">
                  <Smartphone size={18} />
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="space-y-6">
              <button 
                onClick={() => toggleTab('privacy')}
                className="flex items-center justify-between w-full md:cursor-default"
              >
                <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-900 mb-0 md:mb-6">Privacy Policy</h4>
                <ChevronRight size={14} className={`md:hidden transition-transform ${activeTab === 'privacy' ? 'rotate-90' : ''}`} />
              </button>
              <div className={`space-y-4 text-sm text-gray-500 font-medium md:block ${activeTab === 'privacy' ? 'block' : 'hidden'}`}>
                <div className="flex gap-3">
                  <Shield size={16} className="shrink-0 text-blue-500" />
                  <p>Your data is yours. We use standard Firebase security to protect your creations and photos.</p>
                </div>
                <div className="flex gap-3">
                  <Shield size={16} className="shrink-0 text-blue-500" />
                  <p>Personal reference photos are used ONLY for AI generation and never shared without permission.</p>
                </div>
                <div className="flex gap-3">
                  <Shield size={16} className="shrink-0 text-blue-500" />
                  <p>We do not sell your personal information or metadata to third parties.</p>
                </div>
              </div>
            </div>

            {/* Terms Section */}
            <div className="space-y-6">
              <button 
                onClick={() => toggleTab('terms')}
                className="flex items-center justify-between w-full md:cursor-default"
              >
                <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-900 mb-0 md:mb-6">Terms of Service</h4>
                <ChevronRight size={14} className={`md:hidden transition-transform ${activeTab === 'terms' ? 'rotate-90' : ''}`} />
              </button>
              <div className={`space-y-4 text-sm text-gray-500 font-medium md:block ${activeTab === 'terms' ? 'block' : 'hidden'}`}>
                <div className="flex gap-3">
                  <FileText size={16} className="shrink-0 text-blue-500" />
                  <p>eGreetz is for personal, non-commercial use only. Celebrate friends and family.</p>
                </div>
                <div className="flex gap-3">
                  <FileText size={16} className="shrink-0 text-blue-500" />
                  <p>Zero tolerance for harmful, explicit, or hateful generation requests. Safe production only.</p>
                </div>
                <div className="flex gap-3">
                  <FileText size={16} className="shrink-0 text-blue-500" />
                  <p>By using the service, you agree to our responsible AI usage guidelines and safety standards.</p>
                </div>
              </div>
            </div>

            {/* Support Section */}
            <div className="space-y-6">
              <button 
                onClick={() => toggleTab('support')}
                className="flex items-center justify-between w-full md:cursor-default"
              >
                <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-900 mb-0 md:mb-6">Support & Contact</h4>
                <ChevronRight size={14} className={`md:hidden transition-transform ${activeTab === 'support' ? 'rotate-90' : ''}`} />
              </button>
              <div className={`space-y-4 text-sm text-gray-500 font-medium md:block ${activeTab === 'support' ? 'block' : 'hidden'}`}>
                <button 
                  onClick={() => alert('Support Ticket Created: One of our production assistants will reach out via email.')}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-left"
                >
                  <LifeBuoy size={18} />
                  <span>24/7 Help Center</span>
                </button>
                <button 
                  onClick={() => alert('Direct Contact: production@egreetz.ai')}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-left"
                >
                  <MessageSquare size={18} />
                  <span>Production Assistance</span>
                </button>
                <button 
                  onClick={() => window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank')}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-left"
                >
                  <Info size={18} />
                  <span>Billing & Veo Guide</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">© {new Date().getFullYear()} eGreetz Studio Productions</p>
              <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <span className="hover:text-blue-600 cursor-pointer">Privacy</span>
                <span className="hover:text-blue-600 cursor-pointer">Terms</span>
                <span className="hover:text-blue-600 cursor-pointer">Cookies</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              Made with <Sparkles size={12} className="text-blue-500" /> by Hollywood AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Volume2Icon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>
);

export default LandingPage;
