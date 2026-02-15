
import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Globe, Volume2, Share, Users, Type, VolumeX, Mic, Check, Volume1, UserPlus, MessageSquare, Smartphone, Edit3 } from 'lucide-react';

interface Props {
  result: { 
    url: string; 
    params: GenerateGreetingParams; 
    record?: GreetingRecord; 
    audioUrl?: string; 
    voiceUrl?: string; 
    backgroundMusicUrl?: string 
  };
  onRestart: () => void;
  onGoGallery: () => void;
  onInternalShare?: (emails: string[]) => void;
  onEdit?: () => void;
  isViewerOnly?: boolean;
}

/**
 * Decodes raw PCM data (16-bit) into an AudioBuffer.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
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

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery, onInternalShare, onEdit, isViewerOnly = false }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [voiceMuted, setVoiceMuted] = useState(true); // Narrator voice (Moderator) muted by default
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicBufferRef = useRef<AudioBuffer | null>(null);
  const voiceBufferRef = useRef<AudioBuffer | null>(null);
  const musicNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null); // For Fading
  
  const trimStart = result.record?.trimStart || result.params.trimStart || 0;
  const trimEnd = result.record?.trimEnd || result.params.trimEnd || 0;
  const fadeOut = result.record?.fadeOut || result.params.fadeOut || false;

  // Use Short URL if record exists, otherwise fallback to direct URL
  const shareUrl = result.record?.id 
    ? `${window.location.origin}/?v=${result.record.id}` 
    : result.url;
    
  const isCloudLink = result.url.startsWith('http');

  useEffect(() => {
    if (navigator.share && navigator.canShare) {
      const shareData = { title: 'eGreetz', text: 'Cinematic Greeting!', url: shareUrl };
      setCanNativeShare(navigator.canShare(shareData));
    }
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: result.params.occasion || 'Cinematic Greeting',
        artist: 'eGreetz AI Production',
        album: 'High-Fidelity Greetings',
      });
    }
  }, [shareUrl, result.params.occasion]);

  // Audio Asset Loading
  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'playback'
        });
        audioContextRef.current = ctx;
        
        // Master Gain for Fading
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        // Load Narrator Voice if present
        const voiceSource = result.voiceUrl || result.audioUrl;
        if (voiceSource) {
          if (voiceSource.startsWith('data:') || !voiceSource.startsWith('http')) {
            const cleanBase64 = voiceSource.replace(/^data:audio\/(wav|pcm);base64,/, '');
            const bytes = decodeBase64(cleanBase64);
            voiceBufferRef.current = await decodeAudioData(bytes, ctx, 24000, 1);
          } else {
            const resp = await fetch(voiceSource);
            const arrayBuffer = await resp.arrayBuffer();
            try {
              voiceBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
            } catch {
              voiceBufferRef.current = await decodeAudioData(new Uint8Array(arrayBuffer), ctx, 24000, 1);
            }
          }
        }

        // Load Background Track
        const musicSource = result.backgroundMusicUrl || 'https://actions.google.com/static/audio/tracks/Epic_Cinematic_Saga.mp3';
        const musicResp = await fetch(musicSource);
        const musicArrayBuffer = await musicResp.arrayBuffer();
        musicBufferRef.current = await ctx.decodeAudioData(musicArrayBuffer);
      } catch (err) {
        console.error("[Studio] Audio Initialization Failure:", err);
      }
    };

    initAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [result.backgroundMusicUrl, result.voiceUrl, result.audioUrl]);

  // Sync Audio with Video Playback & Handle Fading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply trim start immediately if loading freshly
    if (video.currentTime < trimStart) {
      video.currentTime = trimStart;
    }

    const stopAudio = () => {
      if (musicNodeRef.current) {
        try { musicNodeRef.current.stop(); } catch (e) {}
        musicNodeRef.current = null;
      }
      if (voiceNodeRef.current) {
        try { voiceNodeRef.current.stop(); } catch (e) {}
        voiceNodeRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    const playAudio = async (offset: number) => {
      stopAudio();
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed' || !masterGainRef.current) return;
      
      if (ctx.state === 'suspended') await ctx.resume();

      // Reset master gain
      masterGainRef.current.gain.value = 1;

      // Background Music (Always unmuted by default)
      if (musicBufferRef.current) {
        const mSrc = ctx.createBufferSource();
        mSrc.buffer = musicBufferRef.current;
        mSrc.loop = true;
        const mGain = ctx.createGain();
        mGain.gain.value = 0.25;
        // Connect to Master Gain (which handles fade), not direct destination
        mGain.connect(masterGainRef.current);
        mSrc.connect(mGain);
        mSrc.start(0, offset % musicBufferRef.current.duration);
        musicNodeRef.current = mSrc;
      }

      // Voice Narration (Toggleable, starts muted by default)
      if (voiceBufferRef.current && !voiceMuted) {
        // Adjust audio start time relative to video trim
        if (offset < voiceBufferRef.current.duration) {
            const vSrc = ctx.createBufferSource();
            vSrc.buffer = voiceBufferRef.current;
            vSrc.connect(masterGainRef.current);
            vSrc.start(0, offset);
            voiceNodeRef.current = vSrc;
        }
      }

      // Start Fade Loop
      const loop = () => {
        const t = video.currentTime;
        
        // Handle trim end loop
        if (trimEnd > 0 && t >= trimEnd) {
          video.pause();
          video.currentTime = trimStart;
          video.play().catch(() => {});
          return; // Loop restarts via 'play' event
        }

        // Apply Fade Out
        if (fadeOut && trimEnd > 0) {
           const fadeDuration = 3;
           const timeLeft = trimEnd - t;
           if (timeLeft <= fadeDuration) {
              const factor = Math.max(0, Math.min(1, timeLeft / fadeDuration));
              video.style.opacity = factor.toString();
              if (masterGainRef.current) {
                 // Smoothly ramp gain to prevent clicking, though direct assignment in RAF is usually ok for this duration
                 masterGainRef.current.gain.setValueAtTime(factor, ctx.currentTime);
              }
           } else {
              video.style.opacity = '1';
              if (masterGainRef.current) masterGainRef.current.gain.setValueAtTime(1, ctx.currentTime);
           }
        } else {
           video.style.opacity = '1';
        }
        
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    const onPlay = () => playAudio(video.currentTime);
    const onPause = () => stopAudio();
    const onSeek = () => { if (!video.paused) playAudio(video.currentTime); };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeek);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeek);
      stopAudio();
    };
  }, [voiceMuted, trimStart, trimEnd, fadeOut]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVoice = () => {
    setVoiceMuted(!voiceMuted);
  };

  const handleIndividualShare = () => {
    const email = prompt("Recipient Google Email:");
    if (email && email.trim() && onInternalShare) {
      onInternalShare([email.trim()]);
    }
  };

  const handleGroupShare = () => {
    const emailsStr = prompt("Enter recipient emails separated by commas (Group Chat Blast):");
    if (emailsStr && emailsStr.trim() && onInternalShare) {
      const emails = emailsStr.split(',')
        .map(e => e.trim())
        .filter(e => e.length > 5 && e.includes('@'));
      if (emails.length > 0) {
        onInternalShare(emails);
      } else {
        alert("No valid email addresses found.");
      }
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'eGreetz Cinematic Greeting',
          text: `Check out this cinematic greeting for ${result.params.occasion}!`,
          url: shareUrl
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  };

  const handleSmsShare = () => {
    const message = `Check out this cinematic greeting for ${result.params.occasion}! ${shareUrl}`;
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  return (
    <div className={`w-full max-w-4xl animate-in zoom-in duration-500 ${isViewerOnly ? 'mt-0' : ''}`}>
      {!isViewerOnly && (
        <div className="text-center mb-10 relative">
          <h2 className="text-5xl font-black mb-4 tracking-tighter text-white uppercase italic">Production Wrapped</h2>
          <p className="text-gray-400 font-medium italic opacity-60">"{result.params.message.substring(0, 80)}..."</p>
        </div>
      )}

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mb-8 aspect-video bg-black ring-1 ring-white/10">
        <video 
          ref={videoRef}
          src={result.url} 
          controls 
          autoPlay 
          loop 
          playsInline
          crossOrigin="anonymous"
          className="w-full h-full object-contain bg-black transition-opacity duration-75"
        />

        {showCaptions && (
          <div className="absolute bottom-16 left-0 right-0 px-10 flex justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-xl px-10 py-5 rounded-3xl text-white text-center text-xl font-black border border-white/20 shadow-2xl max-w-[90%] leading-relaxed tracking-tight">
              {result.params.message}
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md ${isCloudLink ? 'bg-blue-600/80' : 'bg-yellow-600/80'}`}>
            {isCloudLink ? <><Globe size={12} /> Cloud Master</> : <><Volume2 size={12} /> Local Production</>}
          </div>
          
          <button 
            onClick={toggleVoice}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-all ${!voiceMuted ? 'bg-blue-600 shadow-lg' : 'bg-gray-800/80 hover:bg-gray-700'}`}
          >
            {voiceMuted ? <><VolumeX size={12} /> Moderator Voice Muted</> : <><Mic size={12} /> Moderator Voice ON</>}
          </button>

          <button 
            onClick={() => setShowCaptions(!showCaptions)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-all ${showCaptions ? 'bg-blue-600 shadow-lg' : 'bg-gray-800/80 hover:bg-gray-700'}`}
          >
            <Type size={12} /> {showCaptions ? 'Captions ON' : 'Captions OFF'}
          </button>
        </div>
      </div>

      {!isViewerOnly && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#111114] border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white uppercase tracking-tight">Share Studio</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Primary Mobile/Chat Group Share - Opens Native Share to Search Groups */}
              {canNativeShare && (
                <button 
                  onClick={handleNativeShare} 
                  className="w-full flex items-center justify-center gap-3 p-5 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20"
                >
                  <Share size={20} /> Text to Group Chat (WhatsApp / iMessage)
                </button>
              )}

              {/* Specialized Text/SMS Button */}
              <button 
                onClick={handleSmsShare} 
                className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm text-gray-200"
              >
                <MessageSquare size={18} className="text-blue-400" /> Share via SMS Group
              </button>

              <div className="h-px bg-white/5 my-2"></div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleIndividualShare} className="flex items-center justify-center gap-3 p-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-bold text-sm hover:bg-blue-600/20">
                  <UserPlus size={18} /> Direct Send
                </button>
                <button onClick={handleGroupShare} className="flex items-center justify-center gap-3 p-4 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-2xl font-bold text-sm hover:bg-purple-600/20">
                  <Users size={18} /> Group Blast
                </button>
              </div>

              <button onClick={handleCopy} className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 font-bold text-sm text-gray-400">
                {copied ? <Check size={18} className="text-green-500" /> : <Globe size={18} />} {copied ? 'Short URL Copied' : 'Copy Short Master Link'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 justify-center">
             {onEdit && (
                <button 
                   onClick={onEdit} 
                   className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-3xl flex items-center justify-center gap-3 transition-all text-lg uppercase tracking-wider shadow-2xl shadow-purple-600/20"
                >
                   <Edit3 size={22} /> Edit in Proof Studio
                </button>
             )}
            <button onClick={onRestart} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all text-lg uppercase tracking-wider shadow-2xl shadow-blue-600/20">
              <RefreshCw size={22} /> New Masterpiece
            </button>
            <button onClick={onGoGallery} className="w-full py-5 bg-white/5 border border-white/10 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider">
              <LayoutGrid size={22} /> View Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreetingResult;