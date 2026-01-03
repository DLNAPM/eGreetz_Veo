
import React from 'react';
import { X, Info, Play, Star, ShieldAlert, HelpCircle, Sparkles, Zap, LayoutGrid, MessageSquare, Camera, Share2, Target, Heart, Wind, PenTool } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-3xl bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto p-8 sm:p-12 custom-scrollbar">
          <header className="mb-12 text-center">
            <div className="inline-flex p-4 bg-blue-600/20 rounded-2xl text-blue-500 mb-6">
              <Star size={32} className="hidden" /> {/* Keep icon imports used via Star/Info/Heart if needed elsewhere, though usually best to remove unused ones. The user only reported Wind and PenTool missing. */}
              <Sparkles size={32} />
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white">Production Guide</h2>
            <p className="text-gray-400 mt-2 max-w-md mx-auto">Master the art of cinematic AI greetings.</p>
          </header>

          <div className="space-y-16">
            {/* INTRODUCTION SECTION */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">What is eGreetz?</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  eGreetz is your personal <span className="text-white font-bold">digital production studio</span>. We use Google's cutting-edge Gemini and Veo AI models to transform simple text messages into movie-quality video greetings with synchronized audio.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">Who is it for?</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Anyone who wants to send more than just a text. Whether it's a birthday, a heartfelt thank you, or a simple hello, eGreetz helps you leave a <span className="text-white font-bold">lasting impression</span> through cinematic storytelling.
                </p>
              </div>
            </section>

            {/* STEP BY STEP GUIDE */}
            <section>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-8 text-center">Your First Masterpiece in 5 Steps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: <Target className="text-blue-400" />, title: "1. Occasion", desc: "Select the theme, from Birthdays to a simple Hello." },
                  // Added missing Wind icon
                  { icon: <Wind className="text-purple-400" />, title: "2. Atmosphere", desc: "Pick a preset or type a Custom Scenic Description." },
                  { icon: <MessageSquare className="text-green-400" />, title: "3. Script", desc: "Type your message. AI will voice it and sync visuals." },
                  { icon: <Camera className="text-yellow-400" />, title: "4. Reference", desc: "Optionally upload a photo to guide the AI's visual style." },
                  { icon: <Zap className="text-red-400" />, title: "5. Produce", desc: "Hit the button and wait for the AI Director to finish." }
                ].map((step, i) => (
                  <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-white/10 transition-all group">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {step.icon}
                    </div>
                    <h4 className="text-white font-bold mb-2">{step.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
                <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex flex-col justify-center items-center text-center">
                  <Share2 className="text-blue-500 mb-3" />
                  <h4 className="text-white font-bold mb-1">6. Share!</h4>
                  <p className="text-[10px] text-blue-300/60 uppercase tracking-widest font-black">Final Distribution</p>
                </div>
              </div>
            </section>

            {/* RECENT FEATURE UPDATES */}
            <section>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Recent Studio Enhancements</h3>
              <div className="space-y-4">
                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    {/* Added missing PenTool icon */}
                    <PenTool size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Custom Scenic Descriptions</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Now you can bypass preset themes. Type exactly what you want to see (e.g., "A golden ballroom in space") and the AI will prioritize your vision.
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Alphabetical Organization</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      All dropdown lists are now sorted A-Z, including new additions like "Hello", "Thank You", and specific "Baby Shower" themes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Dynamic Video Extension</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Longer scripts now automatically trigger a "Director's Cut" extension to ensure the video lasts as long as the generated audio script.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Safety Disclaimer Section */}
            <section className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl flex gap-6">
              <div className="shrink-0 w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Prohibited Content</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                  eGreetz is for entertainment and celebration. Users are strictly prohibited from 
                  generating or sharing content that is illegal, pornographic, exploitative, 
                  or promotes hate. Our AI Director will refuse any unsafe production requests.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={onClose}
              className="px-12 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-500 transition-all uppercase tracking-widest text-sm shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
            >
              Start Producing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
