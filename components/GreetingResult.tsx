
import React, { useState } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Mail, MessageSquare, Check, Plus, Globe } from 'lucide-react';

interface Props {
  result: { url: string; params: GenerateGreetingParams; record?: GreetingRecord };
  onRestart: () => void;
  onGoGallery: () => void;
  onInternalShare?: (email: string) => void;
}

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery, onInternalShare }) => {
  const [copied, setCopied] = useState(false);

  // Fix: The URL is now a permanent HTTPS Firebase Storage link, not a blob.
  const shareUrl = result.url;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const subject = `A cinematic greeting for you: ${result.params.occasion}`;
    const body = `Hi! View this special high-end video greeting created for you: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Fix: Updated SMS URI to prevent the link from appearing in the recipient field on mobile devices.
  const handleSMS = () => {
    const bodyText = `Check out this special cinematic greeting I made for you: ${shareUrl}`;
    // Standard format for most mobile browsers to ensure text goes to body
    window.location.href = `sms:?&body=${encodeURIComponent(bodyText)}`;
  };

  const handleInternalTrigger = () => {
    if (!result.record) {
      alert("Please log in to use internal sharing.");
      return;
    }
    const email = prompt("Enter recipient's Google Account email:");
    if (email && email.includes('@') && onInternalShare) {
      onInternalShare(email);
    } else if (email) {
      alert("Invalid email format.");
    }
  };

  return (
    <div className="w-full max-w-4xl animate-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-black mb-4 tracking-tighter">Production Complete</h2>
        <p className="text-gray-400 font-medium">Hosted on secure cloud storage. Valid worldwide.</p>
      </div>

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mb-8 aspect-video bg-black ring-1 ring-white/10">
        <video 
          src={result.url} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-contain"
        />
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
          <Globe size={10} /> Cloud Hosted
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111114] border border-white/10 rounded-3xl p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <Share2 size={24} className="text-blue-500" /> Distribution
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleCopy}
              className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 font-bold text-sm"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              <span>{copied ? 'Copied' : 'Cloud Link'}</span>
            </button>
            <button 
              onClick={handleEmail}
              className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 font-bold text-sm"
            >
              <Mail size={18} />
              <span>Email</span>
            </button>
            <button 
              onClick={handleSMS}
              className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 font-bold text-sm"
            >
              <MessageSquare size={18} />
              <span>Text SMS</span>
            </button>
            <button 
              onClick={handleInternalTrigger}
              className="flex items-center justify-center gap-3 p-4 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl transition-all font-bold text-sm hover:bg-blue-600/30"
            >
              <Plus size={18} />
              <span>Internal</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 justify-center">
          <button 
            onClick={onRestart}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/30 text-lg uppercase tracking-wider"
          >
            <RefreshCw size={22} /> New Script
          </button>
          <button 
            onClick={onGoGallery}
            className="w-full py-5 bg-white/5 border border-white/10 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider"
          >
            <LayoutGrid size={22} /> To Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingResult;
