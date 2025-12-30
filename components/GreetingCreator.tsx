
import React, { useState, useRef } from 'react';
import { Occasion, GreetingTheme, VoiceGender, GenerateGreetingParams, ImageFile, VeoModel, AspectRatio } from '../types';
import { Mic, Upload, X, Sparkles, Wand2 } from 'lucide-react';

interface Props {
  onGenerate: (params: GenerateGreetingParams) => void;
}

const GreetingCreator: React.FC<Props> = ({ onGenerate }) => {
  const [occasion, setOccasion] = useState<Occasion>(Occasion.BIRTHDAY);
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<GreetingTheme>(GreetingTheme.BALLOONS);
  const [voice, setVoice] = useState<VoiceGender>(VoiceGender.FEMALE);
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
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
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3 text-white">
          <Sparkles className="text-blue-500 w-8 h-8" /> Cinematic Creator
        </h2>
        <p className="text-gray-400 text-lg">Define your vision and let production-grade AI handle the rest.</p>
      </div>

      <div className="space-y-12">
        {/* THE OCCASION - 3 Columns */}
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
              placeholder="Enter the message you want shared..."
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

        {/* Bottom Section - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* YOUR PHOTO (OPTIONAL) */}
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

          {/* VOICE CHARACTER & BACKGROUND SCENE */}
          <div className="space-y-10">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.2em]">Voice Modulation</label>
              <select 
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceGender)}
                className="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-blue-600 text-white font-semibold appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.5em' }}
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
                    className={`px-4 py-4 rounded-xl border text-[11px] font-black transition-all tracking-widest uppercase ${theme === t ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)]' : 'bg-[#0a0a0c] border-white/5 text-gray-600 hover:bg-gray-800'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={() => onGenerate({ occasion, message, theme, voice, userPhoto: photo, model: VeoModel.VEO_FAST, aspectRatio: AspectRatio.LANDSCAPE })}
          disabled={!message.trim()}
          className="w-full py-7 bg-blue-600 rounded-3xl font-black text-2xl flex items-center justify-center gap-5 hover:bg-blue-500 transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_60px_-15px_rgba(37,99,235,0.6)] text-white"
        >
          <Wand2 size={32} /> Generate Production Video
        </button>
      </div>
    </div>
  );
};

export default GreetingCreator;
