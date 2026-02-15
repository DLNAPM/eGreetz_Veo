import React, { useState, useRef, useEffect } from 'react';
import { GenerateGreetingParams, VoiceGender, AudioFile } from '../types';
import { Play, Pause, Save, X, Music, Mic, Volume2, Scissors, Copy, RotateCcw, Sunrise, Sunset } from 'lucide-react';
import { generateGreetingVoice } from '../services/geminiService';

interface Props {
  initialParams: GenerateGreetingParams;
  videoUrl: string;
  initialVoiceUrl?: string;
  initialMusicUrl?: string;
  onSave: (params: GenerateGreetingParams, newVoiceBlob?: Blob, newMusicFile?: File) => void;
  onSaveCopy: (params: GenerateGreetingParams, newVoiceBlob?: Blob, newMusicFile?: File) => void;
  onCancel: () => void;
}

const ProofStudio: React.FC<Props> = ({ 
  initialParams, 
  videoUrl, 
  initialVoiceUrl, 
  initialMusicUrl,
  onSave, 
  onSaveCopy, 
  onCancel 
}) => {
  // State
  const [message, setMessage] = useState(initialParams.message);
  const [voice, setVoice] = useState(initialParams.voice);
  const [trimStart, setTrimStart] = useState(initialParams.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(initialParams.trimEnd || 0);
  const [fadeOut, setFadeOut] = useState(initialParams.fadeOut || false);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Media State
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [tempVoiceUrl, setTempVoiceUrl] = useState<string | null>(initialVoiceUrl || null);
  const [tempVoiceBlob, setTempVoiceBlob] = useState<Blob | undefined>(undefined);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      if (trimEnd === 0 || trimEnd > dur) {
        setTrimEnd(dur);
      }
    }
  };

  // Sync Audio Playback with Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncAudio = () => {
      if (voiceAudioRef.current) {
        if (video.paused) {
          voiceAudioRef.current.pause();
        } else {
          // Sync voice to video time (relative to trim start if needed, but keeping simple alignment here)
          const audioTime = video.currentTime - trimStart; 
          if (audioTime >= 0) {
              voiceAudioRef.current.currentTime = audioTime;
              voiceAudioRef.current.play().catch(() => {});
          }
        }
      }
      if (musicAudioRef.current) {
         if (video.paused) {
             musicAudioRef.current.pause();
         } else {
             musicAudioRef.current.currentTime = video.currentTime;
             musicAudioRef.current.play().catch(() => {});
         }
      }
    };

    const handlePlay = () => { setIsPlaying(true); syncAudio(); };
    const handlePause = () => { setIsPlaying(false); syncAudio(); };
    const handleSeeking = () => { syncAudio(); };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [trimStart]);

  // Real-time Loop for Trimming Check & Fading
  useEffect(() => {
    const loop = () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        
        // Handle Loop/Stop at Trim End
        if (trimEnd > 0 && t >= trimEnd) {
          videoRef.current.pause();
          videoRef.current.currentTime = trimStart;
          setIsPlaying(false);
          // Reset opacity/vol
          videoRef.current.style.opacity = '1';
          if (voiceAudioRef.current) voiceAudioRef.current.volume = 1;
          if (musicAudioRef.current) musicAudioRef.current.volume = 1;
        }

        // Handle Fade Out
        if (fadeOut) {
          const fadeDuration = 3;
          const timeLeft = trimEnd - t;
          
          if (timeLeft <= fadeDuration) {
            // Calculate fade factor (1 to 0)
            const fadeFactor = Math.max(0, Math.min(1, timeLeft / fadeDuration));
            
            videoRef.current.style.opacity = fadeFactor.toString();
            if (voiceAudioRef.current) voiceAudioRef.current.volume = fadeFactor;
            if (musicAudioRef.current) musicAudioRef.current.volume = fadeFactor;
          } else {
            // Reset if scrubbed back before fade
            videoRef.current.style.opacity = '1';
            if (voiceAudioRef.current) voiceAudioRef.current.volume = 1;
            if (musicAudioRef.current) musicAudioRef.current.volume = 1;
          }
        } else {
          // Reset if fade disabled
          videoRef.current.style.opacity = '1';
          if (voiceAudioRef.current) voiceAudioRef.current.volume = 1;
          if (musicAudioRef.current) musicAudioRef.current.volume = 1;
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [trimStart, trimEnd, fadeOut]);

  // Regenerate Voice Preview
  const handleRegenerateVoice = async () => {
    setIsGeneratingVoice(true);
    try {
      const result = await generateGreetingVoice({
        ...initialParams,
        message,
        voice
      });
      if (result) {
        const url = URL.createObjectURL(result.blob);
        setTempVoiceUrl(url);
        setTempVoiceBlob(result.blob);
      }
    } catch (e) {
      console.error("Voice preview failed", e);
      alert("Failed to generate voice preview.");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setMusicFile(e.target.files[0]);
    }
  };

  const constructParams = (): GenerateGreetingParams => ({
    ...initialParams,
    message,
    voice,
    trimStart,
    trimEnd,
    fadeOut
  });

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#111114] border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      
      {/* Left: Preview Area */}
      <div className="flex-grow p-6 bg-black flex flex-col justify-center items-center relative border-r border-white/10">
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
          <video 
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain bg-black transition-opacity duration-75" // Added bg-black so fade to black works visually
            onLoadedMetadata={handleLoadedMetadata}
            playsInline
          />
          {/* Audio Elements (Hidden) */}
          {tempVoiceUrl && <audio ref={voiceAudioRef} src={tempVoiceUrl} />}
          <audio 
            ref={musicAudioRef} 
            src={musicFile ? URL.createObjectURL(musicFile) : initialMusicUrl} 
            loop 
          />

          {/* Custom Controls Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!isPlaying && (
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-full pointer-events-auto cursor-pointer hover:scale-110 transition-transform" onClick={() => videoRef.current?.play()}>
                <Play fill="white" size={32} />
              </div>
            )}
          </div>
          
          {/* Timeline / Trimmer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
             <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">
                <span>Start: {trimStart.toFixed(1)}s</span>
                <span>End: {trimEnd.toFixed(1)}s</span>
             </div>
             
             {/* Simple Range Slider Simulation */}
             <div className="relative h-2 bg-gray-800 rounded-full w-full">
                <div 
                  className="absolute h-full bg-blue-600/50 rounded-full"
                  style={{
                    left: `${(trimStart / videoDuration) * 100}%`,
                    width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                  }}
                />
                <input 
                   type="range" min="0" max={videoDuration} step="0.1"
                   value={trimStart}
                   onChange={(e) => {
                     const v = parseFloat(e.target.value);
                     if (v < trimEnd - 1) {
                        setTrimStart(v);
                        if (videoRef.current) videoRef.current.currentTime = v;
                     }
                   }}
                   className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                />
                <input 
                   type="range" min="0" max={videoDuration} step="0.1"
                   value={trimEnd}
                   onChange={(e) => {
                     const v = parseFloat(e.target.value);
                     if (v > trimStart + 1) setTrimEnd(v);
                   }}
                   className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                />
                {/* Visual Thumbs */}
                <div 
                   className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-none z-10 shadow-lg"
                   style={{ left: `${(trimStart / videoDuration) * 100}%` }}
                />
                <div 
                   className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-none z-10 shadow-lg"
                   style={{ left: `${(trimEnd / videoDuration) * 100}%` }}
                />
             </div>
          </div>
        </div>
        
        <div className="mt-6 flex gap-4 w-full">
           <button 
             onClick={() => onSave(constructParams(), tempVoiceBlob, musicFile || undefined)}
             className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
           >
             <Save size={18} /> Save Changes
           </button>
           <button 
             onClick={() => onSaveCopy(constructParams(), tempVoiceBlob, musicFile || undefined)}
             className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
           >
             <Copy size={18} /> Save as New
           </button>
        </div>
        <button onClick={onCancel} className="mt-4 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest">
            Discard Changes
        </button>
      </div>

      {/* Right: Controls Area */}
      <div className="w-full md:w-96 p-6 md:p-8 bg-[#16161a] overflow-y-auto">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-2">
           <Scissors className="text-blue-500" /> Proof Studio
        </h2>

        <div className="space-y-8">
            {/* Script & Voice */}
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Mic size={14} className="text-blue-500" /> Script & Voice
                </label>
                <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                    <select 
                        value={voice}
                        onChange={(e) => setVoice(e.target.value as VoiceGender)}
                        className="flex-grow bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                    >
                        {Object.values(VoiceGender).map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleRegenerateVoice}
                        disabled={isGeneratingVoice}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                        title="Regenerate Voice Preview"
                    >
                        <RotateCcw size={18} className={isGeneratingVoice ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Background Music */}
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Music size={14} className="text-purple-500" /> Background Music
                </label>
                <div className="relative group">
                    <div className="w-full h-12 bg-black border border-white/10 rounded-xl flex items-center px-4">
                        <span className="text-xs text-gray-400 truncate">
                            {musicFile ? musicFile.name : 'Current Track'}
                        </span>
                    </div>
                    <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleMusicUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <div className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-white">CHANGE</div>
                    </div>
                </div>
            </div>

            {/* Trimming & Fade Info */}
            <div className="space-y-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Scissors size={14} className="text-green-500" /> Timing & Effects
                </label>
                <div className="p-4 bg-black/50 border border-white/5 rounded-xl space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Use the sliders on the video to trim the intro and outro. 
                    </p>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs font-bold text-gray-400">Duration</span>
                      <span className="text-white font-bold text-sm">{(trimEnd - trimStart).toFixed(1)}s</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                       <div className="flex items-center gap-2">
                          <Sunset size={14} className="text-orange-400" />
                          <span className="text-xs font-bold text-gray-400">Fade Out (Last 3s)</span>
                       </div>
                       <button 
                         onClick={() => setFadeOut(!fadeOut)}
                         className={`relative w-10 h-5 rounded-full transition-colors ${fadeOut ? 'bg-orange-500' : 'bg-gray-700'}`}
                       >
                         <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${fadeOut ? 'translate-x-5' : ''}`} />
                       </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProofStudio;