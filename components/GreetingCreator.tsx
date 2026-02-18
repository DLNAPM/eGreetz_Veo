import React, { useState, useRef, useEffect } from 'react';
import { Occasion, GreetingTheme, VoiceGender, GenerateGreetingParams, ImageFile, AudioFile, VeoModel, AspectRatio, GreetingRecord, Speaker } from '../types';
import { Mic, Upload, X, Sparkles, ChevronLeft, Clock, Zap, HelpCircle, ChevronDown, Calendar, Wind, PenTool, Music, Image as ImageIcon, Volume2, ArrowRight, Wand2, User, UserCircle } from 'lucide-react';
import HelpModal from './HelpModal';
import { generateScriptFromImage } from '../services/geminiService';

interface Props {
  onGenerate: (params: GenerateGreetingParams) => void;
  onCancel: () => void;
  initialData?: GreetingRecord | null;
}

const GreetingCreator: React.FC<Props> = ({ onGenerate, onCancel, initialData }) => {
  const [occasion, setOccasion] = useState<Occasion>(Occasion.NONE);
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<GreetingTheme>(GreetingTheme.NONE);
  const [scenicDescription, setScenicDescription] = useState('');
  const [voice, setVoice] = useState<VoiceGender>(VoiceGender.FEMALE);
  const [speaker, setSpeaker] = useState<Speaker>(Speaker.MODERATOR);
  const [photo, setPhoto] = useState<ImageFile | null>(null); // Acts as "Before" image in Before/After mode
  const [scenePhoto, setScenePhoto] = useState<ImageFile | null>(null); // Acts as "After" image in Before/After mode
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const [extended, setExtended] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const isBeforeAndAfter = occasion === Occasion.BEFORE_AND_AFTER;

  const sortedOccasions = [
    Occasion.NONE,
    Occasion.BEFORE_AND_AFTER,
    ...Object.values(Occasion)
      .filter(o => o !== Occasion.NONE && o !== Occasion.BEFORE_AND_AFTER)
      .sort((a, b) => a.localeCompare(b))
  ];
  
  const sortedThemes = [
    GreetingTheme.NONE,
    ...Object.values(GreetingTheme)
      .filter(t => t !== GreetingTheme.NONE)
      .sort((a, b) => a.localeCompare(b))
  ];

  useEffect(() => {
    if (initialData) {
      setOccasion(initialData.occasion);
      setMessage(initialData.message);
      setTheme(initialData.theme);
      if (initialData.voice) setVoice(initialData.voice);
      if (initialData.speaker) setSpeaker(initialData.speaker);
      if (initialData.scenicDescription) setScenicDescription(initialData.scenicDescription);
    }
  }, [initialData]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto({ file, base64: (reader.result as string).split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSceneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setScenePhoto({ file, base64: (reader.result as string).split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAudioFile({ file, base64: (reader.result as string).split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => (prev + ' ' + transcript).trim());
    };
    recognition.start();
  };

  const handleAutoWriteScript = async () => {
    const refImage = scenePhoto || photo;
    if (!refImage) {
      alert("Please upload a Scene or Atmosphere photo first to generate a script based on it.");
      return;
    }
    
    setIsAutoWriting(true);
    try {
      const script = await generateScriptFromImage(refImage, occasion, message);
      if (script) {
        setMessage(script);
        setSpeaker(Speaker.CHARACTER); // Auto-switch to character speaker
      }
    } catch (e) {
      console.error(e);
      alert("Failed to auto-write script.");
    } finally {
      setIsAutoWriting(false);
    }
  };

  const canSubmit = () => {
    if (!message.trim()) return false;
    
    // Strict requirements for Before and After
    if (isBeforeAndAfter) {
      if (!photo) return false; // Missing "Before"
      if (!scenePhoto) return false; // Missing "After"
      if (!scenicDescription.trim()) return false; // Missing Description
    }
    
    return true;
  };

  return (
    <div className="w-full max-w-4xl bg-black border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_0_100px_rgba(37,99,235,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3 text-white">
            <Sparkles className="text-blue-500 w-8 h-8" /> 
            {initialData ? 'Edit Masterpiece' : 'Cinematic Creator'}
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
              title="How to use"
            >
              <HelpCircle size={24} />
            </button>
          </h2>
          <p className="text-gray-400 text-lg">
            {initialData ? 'Refining your cinematic vision...' : 'Define your vision and let AI handle the production.'}
          </p>
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all font-bold text-sm uppercase tracking-wider"
        >
          <ChevronLeft size={18} /> Cancel
        </button>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Select Occasion</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                <Calendar size={18} />
              </div>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value as Occasion)}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-white font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 hover:bg-white/5 transition-all"
              >
                {sortedOccasions.map(occ => (
                  <option key={occ} value={occ} className="bg-[#0a0a0c] text-white py-2">
                    {occ}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="relative group">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Atmospheric Environment</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                <Wind size={18} />
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as GreetingTheme)}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-white font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 hover:bg-white/5 transition-all"
              >
                {sortedThemes.map(t => (
                  <option key={t} value={t} className="bg-[#0a0a0c] text-white py-2">
                    {t}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Voice Modulation (Optional Narration)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                <Volume2 size={18} />
              </div>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceGender)}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-white font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 hover:bg-white/5 transition-all"
              >
                {Object.values(VoiceGender).map(v => (
                  <option key={v} value={v} className="bg-[#0a0a0c] text-white py-2">
                    {v}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Image Upload Section based on Occasion */}
        {isBeforeAndAfter ? (
          <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl animate-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-blue-400" size={18} />
              <label className="block text-xs font-bold text-blue-200 uppercase tracking-[0.2em]">Transformation Visuals (Required)</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* BEFORE IMAGE (Mapped to photo/userPhoto) */}
              <div className="relative group">
                {photo ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-[#0a0a0c]">
                    <img src={URL.createObjectURL(photo.file)} alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] font-bold text-white">BEFORE</div>
                    <button 
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 bg-[#0a0a0c] border-2 border-dashed border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-blue-300 hover:text-white hover:bg-blue-600/10 transition-all"
                  >
                    <Upload size={24} />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Upload "Before"</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="hidden md:flex justify-center text-blue-500">
                <ArrowRight size={24} />
              </div>

              {/* AFTER IMAGE (Mapped to scenePhoto) */}
              <div className="relative group">
                {scenePhoto ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-[#0a0a0c]">
                    <img src={URL.createObjectURL(scenePhoto.file)} alt="After" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] font-bold text-white">AFTER</div>
                    <button 
                      onClick={() => setScenePhoto(null)}
                      className="absolute top-2 right-2 p-2 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => sceneInputRef.current?.click()}
                    className="w-full h-40 bg-[#0a0a0c] border-2 border-dashed border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-blue-300 hover:text-white hover:bg-blue-600/10 transition-all"
                  >
                    <ImageIcon size={24} />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Upload "After"</span>
                  </button>
                )}
                <input ref={sceneInputRef} type="file" className="hidden" accept="image/*" onChange={handleSceneUpload} />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-blue-300 text-center italic">
              AI will interpret the transition between these two images.
            </p>
          </div>
        ) : (
          /* Standard Mode Inputs */
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Scenic Description & Visual Reference</label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                    <PenTool size={18} />
                  </div>
                  <input
                    type="text"
                    value={scenicDescription}
                    onChange={(e) => setScenicDescription(e.target.value)}
                    placeholder="Describe the background or upload a scene photo..."
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 hover:bg-white/5 transition-all placeholder-gray-700 h-full"
                  />
                </div>
                
                <div className="shrink-0">
                  {scenePhoto ? (
                    <div className="relative w-32 h-14 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0c]">
                      <img src={URL.createObjectURL(scenePhoto.file)} alt="Scene" className="w-full h-full object-cover opacity-60" />
                      <button 
                        onClick={() => setScenePhoto(null)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => sceneInputRef.current?.click()}
                      className="w-32 h-14 bg-[#0a0a0c] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-400 hover:bg-[#121214] transition-all"
                    >
                      <ImageIcon size={18} className="opacity-30" />
                      <span className="font-bold text-[8px] uppercase tracking-widest">Scene Ref</span>
                    </button>
                  )}
                  <input ref={sceneInputRef} type="file" className="hidden" accept="image/*" onChange={handleSceneUpload} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Style Reference (Optional)</label>
                {photo ? (
                  <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0c]">
                    <img src={URL.createObjectURL(photo.file)} alt="Preview" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-lg">Asset Ready</span>
                      <button 
                        onClick={() => setPhoto(null)}
                        className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 bg-[#0a0a0c] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-400 hover:bg-[#121214] transition-all"
                  >
                    <Upload size={20} className="opacity-30" />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Atmosphere Photo</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Background Music (Optional)</label>
                {audioFile ? (
                  <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-white/10 bg-blue-600/5 flex items-center justify-center px-4">
                    <div className="flex flex-col items-center">
                      <Music size={20} className="text-blue-500 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 truncate max-w-full">{audioFile.file.name}</span>
                    </div>
                    <button 
                      onClick={() => setAudioFile(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full h-24 bg-[#0a0a0c] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-400 hover:bg-[#121214] transition-all text-center px-4"
                  >
                    <Music size={20} className="opacity-30" />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Upload Audio</span>
                  </button>
                )}
                <input 
                  ref={audioInputRef} 
                  type="file" 
                  className="hidden" 
                  accept=".mp3,.m4a,audio/*" 
                  onChange={handleAudioUpload} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Description Field (Only shown in Before/After here because it was inside the conditional block above for standard mode) */}
        {isBeforeAndAfter && (
           <div>
             <label className="block text-xs font-bold text-blue-200 mb-3 uppercase tracking-[0.2em]">Background Description (Required)</label>
             <div className="relative">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                 <PenTool size={18} />
               </div>
               <input
                 type="text"
                 value={scenicDescription}
                 onChange={(e) => setScenicDescription(e.target.value)}
                 placeholder="E.g., A messy room becoming clean, or a renovation..."
                 className="w-full bg-[#0a0a0c] border border-blue-500/20 rounded-2xl pl-12 pr-4 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 hover:bg-white/5 transition-all placeholder-gray-700 h-full"
               />
             </div>
           </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
                <label className={`text-xs font-bold uppercase tracking-[0.2em] ${isBeforeAndAfter ? 'text-blue-200' : 'text-gray-500'}`}>
                Greeting Script {isBeforeAndAfter ? '(Required)' : ''}
                </label>
                {/* Speaker Toggle */}
                <div className="flex bg-[#16161a] rounded-lg p-0.5 border border-white/10">
                    <button 
                        onClick={() => setSpeaker(Speaker.MODERATOR)}
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md transition-all flex items-center gap-1 ${speaker === Speaker.MODERATOR ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <User size={10} /> Moderator
                    </button>
                    <button 
                        onClick={() => setSpeaker(Speaker.CHARACTER)}
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md transition-all flex items-center gap-1 ${speaker === Speaker.CHARACTER ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        <UserCircle size={10} /> Character
                    </button>
                </div>
            </div>
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{message.length} / 1000</span>
          </div>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here. It will be displayed as cinematic subtitles..."
              className="w-full h-32 bg-[#0a0a0c] border border-white/5 rounded-3xl p-6 text-white text-lg placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none shadow-inner"
              maxLength={1000}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
                {/* Auto Write Button - Only active if we have an image */}
                {(scenePhoto || photo) && (
                    <button
                        onClick={handleAutoWriteScript}
                        disabled={isAutoWriting}
                        className={`p-3 rounded-full transition-all shadow-xl bg-purple-600 hover:bg-purple-500 text-white ${isAutoWriting ? 'animate-pulse' : ''}`}
                        title="Auto-Write Script from Scene Character"
                    >
                        <Wand2 size={20} />
                    </button>
                )}
                <button
                    onClick={startSpeechRecognition}
                    className={`p-3 rounded-full transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    title="Voice to Text"
                >
                    <Mic size={20} />
                </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="p-6 bg-[#0a0a0c] border border-white/5 rounded-3xl flex items-center justify-between w-full max-w-md">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${extended ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                <Clock size={18} />
              </div>
              <div>
                <p className="font-black text-white uppercase tracking-widest text-[10px]">Director's Cut</p>
                <p className="text-gray-500 text-[10px]">14s+ Extended Production</p>
              </div>
            </div>
            <button 
              onClick={() => setExtended(!extended)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${extended ? 'bg-blue-600' : 'bg-gray-800'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${extended ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => onGenerate({ 
              occasion, 
              message, 
              theme, 
              scenicDescription,
              voice,
              speaker,
              userPhoto: photo, 
              scenePhoto,
              backgroundMusic: audioFile,
              model: VeoModel.VEO_FAST, 
              aspectRatio: AspectRatio.LANDSCAPE,
              extended 
            })}
            disabled={!canSubmit()}
            className="w-full py-6 bg-blue-600 rounded-3xl font-black text-2xl flex items-center justify-center gap-5 hover:bg-blue-500 transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_60px_-15px_rgba(37,99,235,0.6)] text-white"
          >
            <Zap size={28} fill="currentColor" /> {initialData ? 'Update & Generate' : `Produce Full Production`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingCreator;