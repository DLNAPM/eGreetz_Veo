
import React from 'react';
import { X, Info, Play, Star, ShieldAlert, HelpCircle } from 'lucide-react';

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
      <div className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto p-8 sm:p-12 custom-scrollbar">
          <header className="mb-10 text-center">
            <div className="inline-flex p-4 bg-blue-600/20 rounded-2xl text-blue-500 mb-6">
              <HelpCircle size={32} />
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white">eGreetz Studio Guide</h2>
            <p className="text-gray-400 mt-2">Everything you need to know about cinematic production.</p>
          </header>

          <div className="space-y-12">
            {/* About Section */}
            <section className="flex gap-6">
              <div className="shrink-0 w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">What is eGreetz?</h3>
                <p className="text-gray-400 leading-relaxed">
                  eGreetz is a state-of-the-art production studio that uses Google's Gemini and Veo AI models 
                  to transform simple text into high-definition cinematic video greetings. We bridge the gap 
                  between personal messages and professional film aesthetics.
                </p>
              </div>
            </section>

            {/* How to Use Section */}
            <section className="flex gap-6">
              <div className="shrink-0 w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                <Play size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Production Workflow</h3>
                <ol className="space-y-3 text-gray-400 list-decimal list-inside marker:text-blue-500 marker:font-black">
                  <li><span className="ml-2">Select the celebration occasion.</span></li>
                  <li><span className="ml-2">Write your script or use Voice-to-Text.</span></li>
                  <li><span className="ml-2">Choose a narrator voice and atmospheric theme.</span></li>
                  <li><span className="ml-2">Optionally upload a photo for AI visual reference.</span></li>
                  <li><span className="ml-2">Generate and distribute via permanent cloud links.</span></li>
                </ol>
              </div>
            </section>

            {/* Features Section */}
            <section className="flex gap-6">
              <div className="shrink-0 w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-400">
                <Star size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Major Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Cinematic Core</p>
                    <p className="text-sm text-gray-300">Powered by Veo 3.1 for high-quality celebratory motion.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Dynamic Sync</p>
                    <p className="text-sm text-gray-300">Video length automatically extends to fit your audio script.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Cloud Hosting</p>
                    <p className="text-sm text-gray-300">Permanent Firebase hosting for global sharing without expiry.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Internal Share</p>
                    <p className="text-sm text-gray-300">Send high-end greetings directly to other Google users.</p>
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
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Entertainment & Safety</h3>
                <p className="text-sm text-gray-400 leading-relaxed italic">
                  eGreetz is intended for entertainment purposes only. Users are strictly prohibited from 
                  generating or sharing content that promotes illegal acts, terrorism, pornography, 
                  exploitation, or abuse of any kind. Automated safety filters are active, and 
                  violations may result in permanent account suspension.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={onClose}
              className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest text-sm"
            >
              Got it, let's create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
