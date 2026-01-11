import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Check, Globe, Volume2, Share, Users, Type, Music } from 'lucide-react';

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
  onInternalShare?: (email: string) => void;
}

/**
 * Wraps raw PCM data into a standard WAV container.
 * This ensures the browser's native media stack treats it as High-Fidelity audio
 * rather than a communication stream (the cause of 'moderator voice' on iOS).
 */
function wrapPcmInWav(pcmData: Uint8Array, sampleRate: number): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  const finalBuffer = new Uint8Array(header.byteLength + pcmData.byteLength);
  finalBuffer.set(new Uint8Array(header), 0);
  finalBuffer.set(pcmData, 44);
  
  return finalBuffer.buffer;
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

const GreetingResult: React.FC<Props> = ({ result, onRestart, onGoGallery, onInternalShare }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const musicBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const musicNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  const shareUrl = result.url;
  const isCloudLink = shareUrl.startsWith('http');

  useEffect(() => {
    if (navigator.share && navigator.canShare) {
      const shareData = { title: 'eGreetz', text: 'Cinematic Greeting!', url: shareUrl };
      setCanNativeShare(navigator.canShare(shareData));
    }
    
    // Explicitly set metadata to help iOS identify this as Media, not a Call.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: result.params.occasion || 'Cinematic Greeting',
        artist: 'eGreetz High-Fidelity Studio',
        album: 'AI Professional Production',
      });
    }
  }, [shareUrl, result.params.occasion]);

  // High-Fidelity Audio Asset Loader
  useEffect(() => {
    const initAudio = async () => {
      try {
        // iOS FIX: explicitly set latencyHint to 'playback'.
        // This forces the OS to use high-quality hardware output instead of 'communication' output.
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'playback'
        });
        
        audioContextRef.current = ctx;

        // 1. Load Human Performance Voice
        const voiceSource = result.voiceUrl || result.audioUrl;
        if (voiceSource) {
          let buffer: AudioBuffer | null = null;
          if (voiceSource.startsWith('data:') || !voiceSource.startsWith('http')) {
            const cleanBase64 = voiceSource.replace(/^data:audio\/(wav|pcm);base64,/, '');
            const bytes = decodeBase64(cleanBase64);
            // Gemini TTS is 24000Hz mono. Wrapping in WAV triggers high-res decoding.
            const wavData = wrapPcmInWav(bytes, 24000);
            buffer = await ctx.decodeAudioData(wavData);
          } else {
            const resp = await fetch(voiceSource);
            const arrayBuffer = await resp.arrayBuffer();
            try {
              buffer = await ctx.decodeAudioData(arrayBuffer);
            } catch {
              // Fallback to PCM-WAV wrapper if raw response
              const wavData = wrapPcmInWav(new Uint8Array(arrayBuffer), 24000);
              buffer = await ctx.decodeAudioData(wavData);
            }
          }
          audioBufferRef.current = buffer;
        }

        // 2. Load Cinematic Atmospheric Track
        const musicSource = result.backgroundMusicUrl || 'https://actions.google.com/static/audio/tracks/Epic_Cinematic_Saga.mp3';
        const musicResp = await fetch(musicSource);
        const musicArrayBuffer = await musicResp.arrayBuffer();
        musicBufferRef.current = await ctx.decodeAudioData(musicArrayBuffer);
      } catch (err) {
        console.error("[Studio] High-Fidelity Audio Init Failure:", err);
      }
    };

    initAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [result.audioUrl, result.voiceUrl, result.backgroundMusicUrl]);

  // Synchronized Cinematic Playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stopAudioNodes = () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        sourceNodeRef.current = null;
      }
      if (musicNodeRef.current) {
        try { musicNodeRef.current.stop(); } catch (e) {}
        musicNodeRef.current = null;
      }
    };

    const playAudioNodes = async (offset: number) => {
      stopAudioNodes();
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') return;
      
      // Proactive resumption for iOS/Safari reliability
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Layer 1: Cinematic Ambience (Looped)
      if (musicBufferRef.current) {
        const mSrc = ctx.createBufferSource();
        mSrc.buffer = musicBufferRef.current;
        mSrc.loop = true;
        const mGain = ctx.createGain();
        mGain.gain.value = 0.28; // Balanced mix
        mGain.connect(ctx.destination);
        mSrc.connect(mGain);
        const mStart = Math.max(0, offset % musicBufferRef.current.duration);
        mSrc.start(0, mStart);
        musicNodeRef.current = mSrc;
      }

      // Layer 2: Master Human Voice (Pinned to Video Time)
      if (audioBufferRef.current) {
        if (offset < audioBufferRef.current.duration) {
          const vSrc = ctx.createBufferSource();
          vSrc.buffer = audioBufferRef.current;
          const vGain = ctx.createGain();
          vGain.gain.value = 1.0; // Primary performance
          vGain.connect(ctx.destination);
          vSrc.connect(vGain);
          vSrc.start(0, offset);
          sourceNodeRef.current = vSrc;
        }
      }
    };

    const handlePlay = () => playAudioNodes(video.currentTime);
    const handlePause = () => stopAudioNodes();
    const handleSeek = () => {
      if (!video.paused) playAudioNodes(video.currentTime);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeek);
    video.addEventListener('waiting', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeek);
      video.removeEventListener('waiting', handlePause);
      stopAudioNodes();
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl animate-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h2 className="text-5xl font-black mb-4 tracking-tighter text-white uppercase italic">Production Wrapped</h2>
        <p className="text-gray-400 font-medium italic opacity-60">"{result.params.message.substring(0, 80)}..."</p>
      </div>

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mb-8 aspect-video bg-black ring-1 ring-white/10">
        <video 
          ref={videoRef}
          src={result.url} 
          controls 
          autoPlay 
          loop 
          muted 
          playsInline
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md bg-green-600/80">
            <Music size={12} /> Studio Audio Mix
          </div>
          <button 
            onClick={() => setShowCaptions(!showCaptions)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-all ${showCaptions ? 'bg-blue-600 shadow-lg' : 'bg-gray-800/80 hover:bg-gray-700'}`}
          >
            <Type size={12} /> {showCaptions ? 'Captions ON' : 'Captions OFF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111114] border border-white/10 rounded-3xl p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white">Share Masterpiece</h3>
          <div className="grid grid-cols-2 gap-4">
            {canNativeShare && (
              <button onClick={() => navigator.share({url: shareUrl})} className="col-span-2 flex items-center justify-center gap-3 p-5 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl transition-all font-black text-sm uppercase tracking-widest">
                <Share size={20} /> App Share
              </button>
            )}
            <button onClick={handleCopy} className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 font-bold text-sm text-gray-300">
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy Link'}
            </button>
            <button onClick={() => {
              const email = prompt("Recipient Google Email:");
              if (email && onInternalShare) onInternalShare(email.trim());
            }} className="flex items-center justify-center gap-3 p-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-bold text-sm hover:bg-blue-600/20">
              <Users size={18} /> Direct Send
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 justify-center">
          <button onClick={onRestart} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all text-lg uppercase tracking-wider shadow-2xl shadow-blue-600/20">
            <RefreshCw size={22} /> New Masterpiece
          </button>
          <button onClick={onGoGallery} className="w-full py-5 bg-white/5 border border-white/10 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider">
            <LayoutGrid size={22} /> View Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingResult;