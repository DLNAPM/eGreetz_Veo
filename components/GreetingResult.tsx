
import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Mail, MessageSquare, Check, Plus, Globe, Volume2, Share } from 'lucide-react';

interface Props {
  result: { url: string; params: GenerateGreetingParams; record?: GreetingRecord; audioUrl?: string };
  onRestart: () => void;
  onGoGallery: () => void;
  onInternalShare?: (email: string) => void;
}

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery, onInternalShare }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Use the permanent HTTPS link provided by Firebase Storage
  const shareUrl = result.url;
  const isCloudLink = shareUrl.startsWith('http');

  useEffect(() => {
    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: 'eGreetz Cinematic Message',
        text: `Check out this cinematic greeting I made for you:`,
        url: shareUrl
      };
      setCanNativeShare(navigator.canShare(shareData));
    }
  }, [shareUrl]);

  // Sync Audio with Video playback
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const onPlay = () => audio.play();
    const onPause = () => audio.pause();
    const onSeeked = () => { audio.currentTime = video.currentTime; };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, []);

  const handleCopy = () => {
    if (!isCloudLink) {
      alert("Note: This is a temporary local link. Log in to generate a permanent cloud link.");
    }
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'eGreetz Cinematic Message',
      text: `Check out this cinematic greeting I made for you!`,
      url: shareUrl
    };

    try {
      await navigator.share(shareData);
    } catch (err) {
      console.error("Share failed:", err);
      // Fallback to SMS if share was cancelled or failed
      handleSMS();
    }
  };

  const handleEmail = () => {
    const subject = `eGreetz: A cinematic message for you!`;
    const body = `View your high-definition cinematic greeting here: ${shareUrl}\n\nSent via eGreetz Production Studio.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSMS = () => {
    const bodyText = `Check out this cinematic greeting I made for you: ${shareUrl}`;
    
    // Improved cross-platform SMS URI handling
    // iOS requires '&body=' if no phone number is specified
    // Android requires '?body='
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const smsUri = isIOS 
      ? `sms:&body=${encodeURIComponent(bodyText)}` 
      : `sms:?body=${encodeURIComponent(bodyText)}`;
      
    window.location.href = smsUri;
  };

  const handleInternalTrigger = () => {
    if (!result.record) {
      alert("Internal sharing requires a permanent cloud record. Please log in.");
      return;
    }
    const email = prompt("Enter the recipient's Google Account email address:");
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
        <p className="text-gray-400 font-medium">Your cinematic masterpiece is synced and ready for distribution.</p>
      </div>

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mb-8 aspect-video bg-black ring-1 ring-white/10">
        <video 
          ref={videoRef}
          src={result.url} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-contain"
        />
        {result.audioUrl && (
          <audio ref={audioRef} src={result.audioUrl} className="hidden" />
        )}
        
        <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md ${isCloudLink ? 'bg-blue-600/80' : 'bg-yellow-600/80'}`}>
          {isCloudLink ? (
            <><Globe size={10} /> Cloud Hosted</>
          ) : (
            <><Volume2 size={10} /> Local Preview Only</>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111114] border border-white/10 rounded-3xl p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <Share2 size={24} className="text-blue-500" /> Share Masterpiece
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {canNativeShare && (
              <button 
                onClick={handleNativeShare}
                className="col-span-2 flex items-center justify-center gap-3 p-5 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl transition-all border border-blue-500/30 font-black text-sm uppercase tracking-widest"
              >
                <Share size={20} />
                <span>Share via App</span>
              </button>
            )}
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
            <RefreshCw size={22} /> New Production
          </button>
          <button 
            onClick={onGoGallery}
            className="w-full py-5 bg-white/5 border border-white/10 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider"
          >
            <LayoutGrid size={22} /> View Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingResult;
