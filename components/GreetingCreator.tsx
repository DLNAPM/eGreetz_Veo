
import React, { useState, useRef } from 'react';
import { Occasion, GreetingTheme, VoiceGender, GenerateGreetingParams, ImageFile, VeoModel, AspectRatio } from '../types';
import { Mic, Upload, X, Sparkles, Wand2, ChevronLeft, Clock, Zap, HelpCircle } from 'lucide-react';
import HelpModal from './HelpModal';

interface Props {
  onGenerate: (params: GenerateGreetingParams & { extended: boolean }) => void;
  onCancel: () => void;
}

const GreetingCreator: React.FC<Props> = ({ onGenerate, onCancel }) => {
  const [occasion, setOccasion] = useState<Occasion>(Occasion.BIRTHDAY);
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<GreetingTheme>(GreetingTheme.BALLOONS);
  const [voice, setVoice] = useState<VoiceGender>(VoiceGender.FEMALE);
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [extended, setExtended] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="w-full max-w-4xl bg-black border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_0_100px_rgba(37,99,235,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3 text-white">
            <Sparkles className="text-blue-500 w-8 h-8" /> 
            Cinematic Creator
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
              title="How to use"
            >
              <HelpCircle size={24} />
            </button>
          </h2>
          <p className="text-gray-400 text-lg">Define your vision and let production-grade AI handle the rest.</p>
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all font-bold text-sm uppercase tracking-wider"
        >
          <ChevronLeft size={18} /> Cancel & Return
        </button>
      </div>

      <div className="space-y-12">
        {/* THE OCCASION */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-6 uppercase tracking-[0.2em]">Select Occasion</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(Occasion).map(occ => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className={`px-6 py-5 rounded-2xl border text-sm font-semibold transition-all text-left ${occasion === occ ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/40' : 'bg-[#0a0a0c] border-white/5 text-gray-400 hover:bg-gray-800'}`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {/* YOUR MESSAGE */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Greeting Script</label>
            <span className="text-xs font-medium text-gray-600">{message.length} / 1000 characters</span>
          </div>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message you want shared... (AI will speed up speech to fit the video)"
              className="w-full h-48 bg-[#0a0a0c] border border-white/5 rounded-3xl p-7 text-white text-lg placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none shadow-inner"
              maxLength={1000}
            />
            <button
              onClick={startSpeechRecognition}
              className={`absolute bottom-5 right-5 p-4 rounded-full transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-[#1c1c1f] hover:bg-[#252529] text-gray-400'}`}
              title="Voice to Text"
            >
              <Mic size={24} />
            </button>
          </div>
        </div>

        {/* Duration Toggle */}
        <div className="p-6 bg-[#0a0a0c] border border-white/5 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${extended ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
              <Clock size={24} />
            </div>
            <div>
              <p className="font-bold text-white uppercase tracking-wider text-xs">Director's Cut</p>
              <p className="text-gray-500 text-sm">Extend video to 15 seconds for more cinematic depth.</p>
            </div>
          </div>
          <button 
            onClick={() => setExtended(!extended)}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${extended ? 'bg-blue-600' : 'bg-gray-800'}`}
          >
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${extended ? 'translate-x-8' : ''}`} />
          </button>
        </div>

        {/* Asset & Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-6 uppercase tracking-[0.2em]">Asset Reference (Optional)</label>
            {photo ? (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/5 group">
                <img src={URL.createObjectURL(photo.file)} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPhoto(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-[#0a0a0c] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-blue-400 hover:bg-[#121214] transition-all"
              >
                <Upload size={48} className="opacity-30" />
                <span className="font-semibold text-base">Upload Visual Reference</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="space-y-10">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.2em]">Voice Modulation</label>
              <select 
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceGender)}
                className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-blue-600 text-white font-semibold appearance-none cursor-pointer"
              >
                {Object.values(VoiceGender).map(v => <option key={v} value={v} className="bg-black">{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.2em]">Atmospheric Environment</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(GreetingTheme).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-4 rounded-xl border text-[11px] font-black transition-all tracking-widest uppercase ${theme === t ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-[#0a0a0c] border-white/5 text-gray-600 hover:bg-gray-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => onGenerate({ 
              occasion, 
              message, 
              theme, 
              voice, 
              userPhoto: photo, 
              model: VeoModel.VEO_FAST, 
              aspectRatio: AspectRatio.LANDSCAPE,
              extended 
            })}
            disabled={!message.trim()}
            className="flex-grow py-7 bg-blue-600 rounded-3xl font-black text-2xl flex items-center justify-center gap-5 hover:bg-blue-500 transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_60px_-15px_rgba(37,99,235,0.6)] text-white"
          >
            <Zap size={32} fill="currentColor" /> Generate {extended ? '15s' : '7s'} Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default GreetingCreator;
