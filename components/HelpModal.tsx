
import React from 'react';
import { X, Info, Play, Star, ShieldAlert, HelpCircle, Sparkles, Zap, LayoutGrid } from 'lucide-react';

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
              <Sparkles size={32} />
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white">Production Studio Updates</h2>
            <p className="text-gray-400 mt-2">Latest cinematic tools and AI enhancements.</p>
          </header>

          <div className="space-y-12">
            {/* NEW FEATURES SECTION */}
            <section>
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Latest Enhancements</h3>
              <div className="grid grid-cols-1 gap-6">
                
                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Custom Scenic Descriptions</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Beyond presets, you can now type a specific visual prompt. Our AI prioritizes your description to create truly unique environments like "Cyberpunk Tokyo" or "Floating Islands".
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Optimized UI & Sorting</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Occasions and Environments are now sorted alphabetically (A-Z) in sleek dropdown menus, making it easier to find "Hello", "Thank You", or "Baby Shower" presets.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="shrink-0 w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Perfect Audio-Visual Sync</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      The studio now analyzes your script length. If your message is long, the video duration automatically extends beyond 7s to ensure every word is heard clearly.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* Production Workflow */}
            <section className="flex gap-6">
              <div className="shrink-0 w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Production Workflow</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  1. Choose a script occasion (now including "Hello" and "Thank You").<br/>
                  2. Define the visual atmosphere via dropdown or Custom Scenic Description.<br/>
                  3. Select a voice modulation (Tenor, Bass, or Female).<br/>
                  4. Hit "Produce" to generate a cinematic masterpiece synced to your speech.
                </p>
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
                  exploitation, or abuse of any kind. Automated safety filters are active.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={onClose}
              className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(37,99,235,0.4)]"
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
