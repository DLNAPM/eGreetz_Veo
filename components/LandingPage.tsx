
import React from 'react';
// Added MessageSquare to the import list from lucide-react
import { LogIn, Video, Mic, Share2, Shield, FileText, LifeBuoy, Sparkles, ChevronRight, PlayCircle, MessageSquare } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="flex flex-col w-full bg-white text-gray-900 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white -z-10" />
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-xs uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles size={14} /> AI-Powered Cinematic Greetings
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1] max-w-4xl">
          Create <span className="text-gradient">Movie-Quality</span> <br /> Greetings in Seconds
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-12 leading-relaxed">
          Transform simple text into breathtaking cinematic videos with personalized voices and stunning 8K visuals. Your vision, produced by Hollywood AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onLogin}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <LogIn size={20} strokeWidth={3} /> Start Creating for Free
          </button>
        </div>
      </section>

      {/* Feature 1: Visuals */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-gray-100 group">
              <img 
                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800" 
                alt="Cinematic Visuals" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <PlayCircle size={64} className="text-white opacity-80" />
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Video size={24} />
            </div>
            <h2 className="text-4xl font-black tracking-tight">AI-Powered Cinematography</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Powered by Google's Veo 3.1, eGreetz renders breathtaking atmosphere, lighting, and camera work based on your scenic descriptions. From golden ballrooms to starry skies, your imagination is the only limit.
            </p>
            <ul className="space-y-4">
              {['8K Cinematic Rendering', 'Atmospheric Lighting', 'Dynamic Camera Movements'].map((item) => (
                <li key={item} className="flex items-center gap-3 font-bold text-gray-700">
                  <ChevronRight size={18} className="text-blue-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 2: Voice */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <Mic size={24} />
            </div>
            <h2 className="text-4xl font-black tracking-tight">Expressive Voice Synthesis</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Don't just show them, tell them. Our Gemini-powered TTS engine creates warm, human-like narration in Tenor, Bass, or Female voices. Every emotion in your script is captured and perfectly synchronized with the visuals.
            </p>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-bold shadow-sm">Heartfelt Tone</div>
              <div className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-bold shadow-sm">Crystal Clear Narration</div>
            </div>
          </div>
          <div className="relative">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 space-y-4 max-w-sm mx-auto">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                 <span className="text-xs font-black uppercase tracking-widest text-gray-400">Synthesizing...</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full w-full" />
               <div className="h-2 bg-gray-100 rounded-full w-3/4" />
               <div className="h-2 bg-gray-100 rounded-full w-1/2" />
               <div className="pt-4 flex justify-between items-center">
                 <div className="text-sm font-bold text-blue-600">Male (Bass)</div>
                 <Volume2Icon className="text-blue-600 animate-bounce" />
               </div>
             </div>
             {/* Decorative circles */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -z-10" />
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Feature 3: Sharing */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex w-16 h-16 bg-green-100 rounded-[2rem] items-center justify-center text-green-600 mb-4">
            <Share2 size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Instant Cloud Sharing</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            One-click sharing to WhatsApp, iMessage, and social groups. Our Short URL engine creates professional branded links that recipients can view instantly—no login required.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h4 className="font-bold mb-2">Group Blast</h4>
              <p className="text-xs text-gray-500">Send to multiple recipients in one click.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h4 className="font-bold mb-2">Search Integrated</h4>
              <p className="text-xs text-gray-500">Native mobile integration with search.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h4 className="font-bold mb-2">Public Viewer</h4>
              <p className="text-xs text-gray-500">Recipients watch without an account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 bg-gray-900 text-white text-center">
        <h2 className="text-4xl font-black mb-8">Ready to produce your first hit?</h2>
        <button 
          onClick={onLogin}
          className="px-12 py-5 bg-white text-gray-900 rounded-2xl font-black text-xl hover:bg-gray-100 transition-all active:scale-95"
        >
          Get Started Now
        </button>
      </section>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">eG</div>
              <span className="text-xl font-black">eGreetz</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Bringing Hollywood cinematography to your personal messages. Powered by next-gen AI.
            </p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              <li className="hover:text-blue-600 cursor-pointer">Studio Features</li>
              <li className="hover:text-blue-600 cursor-pointer">Voice Library</li>
              <li className="hover:text-blue-600 cursor-pointer">Cloud Gallery</li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-6">Support</h4>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              <li className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                <LifeBuoy size={16} /> Help Center
              </li>
              <li className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                <MessageSquare size={16} /> Contact Us
              </li>
              <li className="hover:text-blue-600 cursor-pointer" onClick={() => alert('Support: support@egreetz.ai')}>Production Assistance</li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] text-gray-400 mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              <li className="flex items-center gap-2 hover:text-blue-600 cursor-pointer" onClick={() => alert('Privacy Policy: We do not sell your data. Your videos are private to you.')}>
                <Shield size={16} /> Privacy Policy
              </li>
              <li className="flex items-center gap-2 hover:text-blue-600 cursor-pointer" onClick={() => alert('Terms of Service: For personal use and celebration only. No harmful content.')}>
                <FileText size={16} /> Terms of Service
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-gray-400">
          <p>© {new Date().getFullYear()} eGreetz Productions. All rights reserved.</p>
          <div className="flex gap-8">
            <span className="hover:text-blue-600 cursor-pointer">Privacy</span>
            <span className="hover:text-blue-600 cursor-pointer">Terms</span>
            <span className="hover:text-blue-600 cursor-pointer">Cookies</span>
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
