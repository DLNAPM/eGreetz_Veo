
import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, GreetingRecord } from '../types';
import { RefreshCw, LayoutGrid, Share2, Copy, Check, Globe, Volume2, Share, Users } from 'lucide-react';

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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const musicBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const musicNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  const shareUrl = result.url;
  const isCloudLink = shareUrl.startsWith('http');

  useEffect(() => {
    if (navigator.share && navigator.canShare) {
      const shareData = { title: 'eGreetz', text: 'Greeting!', url: shareUrl };
      setCanNativeShare(navigator.canShare(shareData));
    }
  }, [shareUrl]);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        const voiceSource = result.voiceUrl || result.audioUrl;
        if (voiceSource) {
          let buffer: AudioBuffer | null = null;
          if (voiceSource.startsWith('data:') || !voiceSource.startsWith('http')) {
            const cleanBase64 = voiceSource.replace(/^data:audio\/(wav|pcm);base64,/, '');
            const bytes = decodeBase64(cleanBase64);
            buffer = await decodePCM(bytes, ctx, 24000, 1);
          } else {
            const resp = await fetch(voiceSource);
            const arrayBuffer = await resp.arrayBuffer();
            try {
              buffer = await ctx.decodeAudioData(arrayBuffer);
            } catch {
              buffer = await decodePCM(new Uint8Array(arrayBuffer), ctx, 24000, 1);
            }
          }
          audioBufferRef.current = buffer;
        }

        if (result.backgroundMusicUrl) {
          const response = await fetch(result.backgroundMusicUrl);
          const arrayBuffer = await response.arrayBuffer();
          musicBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
        }
      } catch (err) {
        console.error("[Studio] Audio System Error:", err);
      }
    };

    initAudio();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [result.audioUrl, result.voiceUrl, result.backgroundMusicUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stopNodes = () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        sourceNodeRef.current = null;
      }
      if (musicNodeRef.current) {
        try { musicNodeRef.current.stop(); } catch (e) {}
        musicNodeRef.current = null;
      }
    };

    const playNodes = (offset: number) => {
      stopNodes();
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') ctx.resume();

      if (musicBufferRef.current) {
        const mSrc = ctx.createBufferSource();
        mSrc.buffer = musicBufferRef.current;
        mSrc.loop = true;
        const mGain = ctx.createGain();
        mGain.gain.value = 0.4;
        mGain.connect(ctx.destination);
        mSrc.connect(mGain);
        const mStart = Math.max(0, offset % musicBufferRef.current.duration);
        mSrc.start(0, mStart);
        musicNodeRef.current = mSrc;
      }

      if (audioBufferRef.current) {
        if (offset < audioBufferRef.current.duration) {
          const vSrc = ctx.createBufferSource();
          vSrc.buffer = audioBufferRef.current;
          vSrc.connect(ctx.destination);
          vSrc.start(0, offset);
          sourceNodeRef.current = vSrc;
        }
      }
    };

    const handlePlay = () => playNodes(video.currentTime);
    const handlePause = () => stopNodes();
    const handleSeek = () => {
      if (!video.paused) playNodes(video.currentTime);
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
      stopNodes();
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
        <h2 className="text-5xl font-black mb-4 tracking-tighter">Production Wrapped</h2>
        <p className="text-gray-400 font-medium italic">"{result.params.message.substring(0, 100)}..."</p>
      </div>

      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 mb-8 aspect-video bg-black ring-1 ring-white/10">
        {/* CRITICAL: Video is MUTED to prevent AI background chatter. Audio is handled by AudioContext Moderator. */}
        <video 
          ref={videoRef}
          src={result.url} 
          controls 
          autoPlay 
          loop 
          muted
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
        />
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md ${isCloudLink ? 'bg-blue-600/80' : 'bg-yellow-600/80'}`}>
            {isCloudLink ? <><Globe size={10} /> Cloud Link</> : <><Volume2 size={10} /> Local Link</>}
          </div>
          {(result.audioUrl || result.voiceUrl) && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md bg-green-600/80">
              <Volume2 size={10} /> Moderator Active
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111114] border border-white/10 rounded-3xl p-8">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">Share Masterpiece</h3>
          <div className="grid grid-cols-2 gap-4">
            {canNativeShare && (
              <button onClick={() => navigator.share({url: shareUrl})} className="col-span-2 flex items-center justify-center gap-3 p-5 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl transition-all font-black text-sm uppercase tracking-widest">
                <Share size={20} /> App Share
              </button>
            )}
            <button onClick={handleCopy} className="flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 font-bold text-sm">
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy Link'}
            </button>
            <button onClick={() => {
              const email = prompt("Recipient Google Email:");
              if (email && onInternalShare) onInternalShare(email.trim());
            }} className="flex items-center justify-center gap-3 p-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl font-bold text-sm hover:bg-blue-600/20">
              <Users size={18} /> Send to Friend
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 justify-center">
          <button onClick={onRestart} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all text-lg uppercase tracking-wider">
            <RefreshCw size={22} /> Start New
          </button>
          <button onClick={onGoGallery} className="w-full py-5 bg-white/5 border border-white/10 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-gray-400 hover:text-white uppercase tracking-wider">
            <LayoutGrid size={22} /> Go to Library
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingResult;
