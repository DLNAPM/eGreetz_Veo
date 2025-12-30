import React, { useState } from 'react';
import { GenerateGreetingParams } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Mail, MessageSquare, Check, Plus } from 'lucide-react';

interface Props {
  result: { url: string; params: GenerateGreetingParams };
  onRestart: () => void;
  onGoGallery: () => void;
}

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const subject = `A special greeting for you: ${result.params.occasion}`;
    const body = `Hi! I created this special cinematic greeting for you: ${result.url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSMS = () => {
    window.location.href = `sms:?body=${encodeURIComponent("Check out this special greeting I made for you: " + result.url)}`;
  };

  return (
    <div className="w-full max-w-4xl animate-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-extrabold mb-4">It's Beautiful!</h2>
        <p className="text-gray-400">Your personalized cinematic greeting is ready to share.</p>
      </div>

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 mb-8 aspect-video bg-black ring-1 ring-white/20">
        <video 
          src={result.url} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-4 right-4 text-white/40 text-[10px] font-medium tracking-widest uppercase select-none pointer-events-none">
          Created by e-Greetz
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111114] border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Share2 size={20} className="text-indigo-400" /> Share Everywhere
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button 
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            >
              <Mail size={18} />
              <span>Email</span>
            </button>
            <button 
              onClick={handleSMS}
              className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            >
              <MessageSquare size={18} />
              <span>Text SMS</span>
            </button>
            <button 
              className="flex items-center justify-center gap-2 p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl transition-all"
            >
              <Plus size={18} />
              <span>Internal</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onRestart}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98]"
          >
            <RefreshCw size={20} /> Create Another Greeting
          </button>
          <button 
            onClick={onGoGallery}
            className="w-full py-4 bg-white/5 border border-white/10 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
          >
            <LayoutGrid size={20} /> Back to Gallery
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingResult;