
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
    <div className="w-full max-w-4xl bg-black border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-4xl font-bold mb-2 flex items-center gap-3 text-white">
          <Sparkles className="text-indigo-500 w-8 h-8" /> Create Your Greeting
        </h2>
        <p className="text-gray-400 text-lg">Set the occasion and let AI bring your message to life.</p>
      </div>

      <div className="space-y-10">
        {/* Occasion Section - 3 Columns */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.2em]">The Occasion</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.values(Occasion).map(occ => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className={`px-5 py-4 rounded-xl border text-sm font-semibold transition-all text-left ${occasion === occ ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#0a0a0c] border-white/5 text-gray-400 hover:bg-gray-800'}`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        {/* Message Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Your Message</label>
            <span className="text-xs font-medium text-gray-600">{message.length} / 1000 words</span>
          </div>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to say?"
              className="w-full h-44 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 text-white text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none shadow-inner"
              maxLength={1000}
            />
            <button
              onClick={startSpeechRecognition}
              className={`absolute bottom-4 right-4 p-3 rounded-full transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
            >
              <Mic size={24} />
            </button>
          </div>
        </div>

        {/* Media and Character Section - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column: Photo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-[0.2em]">Your Photo (Optional)</label>
            {photo ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/5 group">
                <img src={URL.createObjectURL(photo.file)} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPhoto(null)}
                  className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-[#0a0a0c] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-indigo-400 hover:bg-[#121214] transition-all"
              >
                <Upload size={40} />
                <span className="font-semibold text-sm">Upload Profile Image</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          {/* Right Column: Voice and Theme */}
          <div className="space-y-10">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Voice Character</label>
              <select 
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceGender)}
                className="w-full bg-[#0a0a0c] border border-white/5 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-white font-medium"
              >
                {Object.values(VoiceGender).map(v => <option key={v} value={v} className="bg-black">{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Background Scene</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(GreetingTheme).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all tracking-wider uppercase ${theme === t ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/5' : 'bg-[#0a0a0c] border-white/5 text-gray-600 hover:bg-gray-800'}`}
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
          className="w-full py-6 bg-indigo-600 rounded-2xl font-black text-xl flex items-center justify-center gap-4 hover:bg-indigo-500 transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] text-white"
        >
          <Wand2 size={28} /> Generate Cinematic Greeting
        </button>
      </div>
    </div>
  );
};

export default GreetingCreator;
