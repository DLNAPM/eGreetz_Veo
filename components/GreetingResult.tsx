
import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Mail, MessageSquare, Check, Plus, Globe, Volume2, Share, Users, Music } from 'lucide-react';

interface Props {
  result: { url: string; params: GenerateGreetingParams; record?: GreetingRecord; audioUrl?: string; backgroundMusicUrl?: string };
  onRestart: () => void;
  onGoGallery: () => void;
  onInternalShare?: (email: string) => void;
}

// Helper functions for raw PCM decoding as per Gemini API requirements
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure the underlying buffer is handled safely for 16-bit conversion
  const bufferCopy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const dataInt16 = new Int16Array(bufferCopy);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery, onInternalShare }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Audio state management
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const musicBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const musicNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Use the permanent HTTPS link provided by Firebase Storage
  const shareUrl = result.url;
  const isCloudLink = shareUrl.startsWith('http');

  useEffect(() => {
    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: 'eGreetz Cinematic Message',
        text: `Check out this cinematic greeting I made for you!`,
        url: shareUrl
      };
      setCanNativeShare(navigator.canShare(shareData));
    }
  }, [shareUrl]);

  // Handle Audio Initialization (Raw PCM decoding for TTS and standard decoding for music)
  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        // Gain node to balance volumes
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNodeRef.current = gainNode;

        // Load TTS
        if (result.audioUrl) {
          const base64Data = result.audioUrl.replace(/^data:audio\/wav;base64,/, '').replace(/^data:audio\/pcm;base64,/, '');
          const bytes = decodeBase64(base64Data);
          const buffer = await decodePCM(bytes, ctx, 24000, 1);
          audioBufferRef.current = buffer;
        }

        // Load Background Music
        if (result.backgroundMusicUrl) {
          const response = await fetch(result.backgroundMusicUrl);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer);
          musicBufferRef.current = buffer;
        }
      } catch (err) {
        console.error("Audio decoding failed:", err);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [result.audioUrl, result.backgroundMusicUrl]);

  // Sync Audio with Video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stopAudio = () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        sourceNodeRef.current = null;
      }
      if (musicNodeRef.current) {
        try { musicNodeRef.current.stop(); } catch (e) {}
        musicNodeRef.current = null;
      }
    };

    const playAudio = (offset: number = 0) => {
      stopAudio();
      if (!audioContextRef.current) return;

      const ctx = audioContextRef.current;

      // Play Background Music
      if (musicBufferRef.current) {
        const musicSource = ctx.createBufferSource();
        musicSource.buffer = musicBufferRef.current;
        musicSource.loop = true;
        
        // Connect to a dedicated gain for music if needed, currently using primary
        const musicGain = ctx.createGain();
        musicGain.gain.value = 0.5; // Lower music volume slightly for clarity
        musicGain.connect(ctx.destination);
        
        const musicStartTime = Math.max(0, offset % musicBufferRef.current.duration);
        musicSource.start(0, musicStartTime);
        musicNodeRef.current = musicSource;
      }

      // Play TTS
      if (audioBufferRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(ctx.destination);
        
        const startTime = Math.max(0, Math.min(offset, audioBufferRef.current.duration));
        source.start(0, startTime);
        sourceNodeRef.current = source;
      }
    };

    const onPlay = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      playAudio(video.currentTime);
    };
    
    const onPause = () => stopAudio();
    const onSeeked = () => {
      if (!video.paused) {
        playAudio(video.currentTime);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onPause);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onPause);
      stopAudio();
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
      console.error("Native share failed:", err);
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
    
    const emailsInput = prompt("Enter recipient Google Account email addresses (separate multiple with commas):");
    
    if (emailsInput) {
      const emails = emailsInput.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length === 0) {
        alert("Please enter at least one valid email address.");
        return;
      }

      emails.forEach(email => {
        if (onInternalShare) {
          onInternalShare(email);
        }
      });

      alert(`Sharing initiated for ${emails.length} recipient(s). They will see this in their eGreetz library shortly.`);
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
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
        />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md ${isCloudLink ? 'bg-blue-600/80' : 'bg-yellow-600/80'}`}>
            {isCloudLink ? (
              <><Globe size={10} /> Cloud Hosted</>
            ) : (
              <><Volume2 size={10} /> Local Preview Only</>
            )}
          </div>
          {result.backgroundMusicUrl && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md bg-purple-600/80">
              <Music size={10} /> Custom Audio
            </div>
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
                className="col-span-2 flex items-center justify-center gap-3 p-5 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl transition-all border border-blue-500/30 font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20"
              >
                <Share size={20} />
                <span>Share via App / Group</span>
              </button>
            )}
            <button 
              onClick={handleCopy}
              className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 font-bold text-sm"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
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
              <span>Direct SMS</span>
            </button>
            <button 
              onClick={handleInternalTrigger}
              className="flex items-center justify-center gap-3 p-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl transition-all font-bold text-sm hover:bg-blue-600/20"
            >
              <Users size={18} />
              <span>Group Invite</span>
            </button>
          </div>
          <p className="mt-6 text-[11px] text-gray-500 text-center italic">
            Tip: Use "Share via App" to send to group chats in iMessage, WhatsApp, or Messenger.
          </p>
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
