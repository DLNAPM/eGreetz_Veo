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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    <div className="w-full max-w-3xl bg-[#111114] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="text-indigo-400" /> Create Your Greeting
        </h2>
        <p className="text-gray-400">Set the occasion and let AI bring your message to life.</p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">The Occasion</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.values(Occasion).map(occ => (
              <button
                key={occ}
                onClick={() => setOccasion(occ)}
                className={`p-3 rounded-xl border text-sm transition-all text-left ${occasion === occ ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Your Message</label>
            <span className="text-xs text-gray-500">{message.split(/\s+/).filter(w => w.length > 0).length} / 1000 words</span>
          </div>
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to say?"
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              maxLength={5000}
            />
            <button
              onClick={startSpeechRecognition}
              className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
              title="Speak your message"
            >
              <Mic size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Your Photo (Optional)</label>
            {photo ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                <img src={URL.createObjectURL(photo.file)} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-white hover:bg-white/10 hover:border-indigo-500/50 transition-all"
              >
                <Upload size={32} />
                <span>Upload Profile Image</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Voice Character</label>
              <select 
                value={voice}
                onChange={(e) => setVoice(e.target.value as VoiceGender)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.values(VoiceGender).map(v => <option key={v} value={v} className="bg-[#111114]">{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Background Scene</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(GreetingTheme).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`p-2 rounded-lg border text-xs transition-all ${theme === t ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onGenerate({ occasion, message, theme, voice, userPhoto: photo, model: VeoModel.VEO_FAST, aspectRatio: AspectRatio.LANDSCAPE })}
          disabled={!message.trim()}
          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 /> Generate Cinematic Greeting
        </button>
      </div>
    </div>
  );
};

export default GreetingCreator;