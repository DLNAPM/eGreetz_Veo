
import React, { useState, useEffect } from 'react';
import { 
  loginWithGoogle, 
  logout, 
  getUserGreetings, 
  saveGreeting, 
  updateGreeting,
  deleteGreeting, 
  isFirebaseEnabled, 
  onAuthStateChangedListener,
  uploadVideoToCloud,
  uploadAudioToCloud,
  getReceivedGreetings,
  sendToInternalUser,
  type User 
} from './services/firebase';
import { AppState, GenerateGreetingParams, GreetingRecord, VeoModel, AspectRatio, VoiceGender } from './types';
import GreetingCreator from './components/GreetingCreator';
import GreetingGallery from './components/GreetingGallery';
import GreetingResult from './components/GreetingResult';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyDialog from './components/ApiKeyDialog';
import HelpModal from './components/HelpModal';
import { LogIn, LogOut, Plus, ShieldCheck, Key, AlertCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { generateGreetingVideo, generateGreetingVoice } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [myGreetings, setMyGreetings] = useState<GreetingRecord[]>([]);
  const [receivedGreetings, setReceivedGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ url: string; params: GenerateGreetingParams; record?: GreetingRecord; audioUrl?: string; backgroundMusicUrl?: string } | null>(null);
  const [editingGreeting, setEditingGreeting] = useState<GreetingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isKeyConnected, setIsKeyConnected] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsFirebaseReady(isFirebaseEnabled());
      
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyConnected(hasKey);
      } else {
        const key = process.env.API_KEY;
        setIsKeyConnected(!!key);
      }
    };
    
    init();

    const unsubscribe = onAuthStateChangedListener((u) => {
      setUser(u);
      if (u) {
        loadData(u);
        if (appState === AppState.AUTH) {
          setAppState(AppState.GALLERY);
        }
      } else {
        setAppState(AppState.AUTH);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [appState]);

  const loadData = async (u: User) => {
    try {
      const [mine, received] = await Promise.all([
        getUserGreetings(u.uid),
        u.email ? getReceivedGreetings(u.email) : Promise.resolve([])
      ]);
      setMyGreetings(mine);
      setReceivedGreetings(received);
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  };

  const handleRefresh = () => {
    if (user) {
      loadData(user);
    }
  };

  const handleGenerate = async (params: GenerateGreetingParams) => {
    if (!user) {
      alert("Please login with your Google Account to create and share cinematic greetings.");
      setAppState(AppState.AUTH);
      return;
    }

    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowApiKeyDialog(true);
        return;
      }
    }

    setIsLoading(true);
    setAppState(AppState.LOADING);
    
    try {
      // 1. Generate Voice (TTS)
      const voiceResult = await generateGreetingVoice(params.message, params.voice);
      const audioDuration = voiceResult?.duration || 7;
      const audioBase64 = voiceResult?.base64;

      // 2. Generate Cinematic Video (Automatically extends if script is long or extended flag is set)
      const { blob } = await generateGreetingVideo({ 
        ...params, 
        audioDuration 
      });
      
      let finalUrl = "";
      let backgroundMusicUrl = "";
      let newRecord: GreetingRecord | undefined;

      if (isFirebaseReady) {
        // Parallel upload if possible
        const uploads = [uploadVideoToCloud(blob, user.uid)];
        if (params.backgroundMusic) {
          uploads.push(uploadAudioToCloud(params.backgroundMusic.file, user.uid));
        }

        const [vUrl, aUrl] = await Promise.all(uploads);
        finalUrl = vUrl;
        backgroundMusicUrl = aUrl || (editingGreeting?.backgroundMusicUrl || "");
        
        if (editingGreeting) {
          // Update existing record
          await updateGreeting(editingGreeting.id, {
            occasion: params.occasion,
            message: params.message,
            theme: params.theme,
            scenicDescription: params.scenicDescription,
            videoUrl: finalUrl,
            voice: params.voice,
            backgroundMusicUrl: backgroundMusicUrl
          });

          newRecord = {
            ...editingGreeting,
            occasion: params.occasion,
            message: params.message,
            theme: params.theme,
            scenicDescription: params.scenicDescription,
            videoUrl: finalUrl,
            voice: params.voice,
            backgroundMusicUrl: backgroundMusicUrl
          };
        } else {
          // Save new record
          const docRef = await saveGreeting(user.uid, {
            userId: user.uid,
            occasion: params.occasion,
            message: params.message,
            theme: params.theme,
            scenicDescription: params.scenicDescription,
            videoUrl: finalUrl,
            voice: params.voice,
            backgroundMusicUrl: backgroundMusicUrl,
            createdAt: Date.now()
          });

          newRecord = {
            id: docRef.id,
            userId: user.uid,
            occasion: params.occasion,
            message: params.message,
            theme: params.theme,
            scenicDescription: params.scenicDescription,
            videoUrl: finalUrl,
            voice: params.voice,
            backgroundMusicUrl: backgroundMusicUrl,
            createdAt: Date.now()
          };
        }

        setEditingGreeting(null);
        loadData(user);
      } else {
        finalUrl = URL.createObjectURL(blob);
        backgroundMusicUrl = params.backgroundMusic ? URL.createObjectURL(params.backgroundMusic.file) : "";
      }

      setCurrentResult({ 
        url: finalUrl, 
        params, 
        record: newRecord,
        audioUrl: audioBase64,
        backgroundMusicUrl: backgroundMusicUrl
      });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Production Error:", e);
      const errorMsg = e.toString();
      
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("limit exceeded")) {
        alert("Daily Production Quota Reached: Your Google Cloud project has hit its limit for today. You can request more in the Cloud Console > IAM & Admin > Quotas or wait until it resets at midnight.");
      } else if (errorMsg.includes("Requested entity was not found")) {
        setIsKeyConnected(false);
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        alert("Production Error: " + errorMsg);
      }
      
      setAppState(user ? AppState.GALLERY : AppState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Permanently delete this cinematic greeting?")) {
      try {
        await deleteGreeting(id);
        if (user) loadData(user);
      } catch (error) {
        console.error("Deletion failed:", error);
      }
    }
  };

  const handleEdit = (greeting: GreetingRecord) => {
    setEditingGreeting(greeting);
    setAppState(AppState.IDLE);
  };

  const handleSelectGreeting = (greeting: GreetingRecord) => {
    setCurrentResult({
      url: greeting.videoUrl,
      record: greeting,
      backgroundMusicUrl: greeting.backgroundMusicUrl,
      params: {
        occasion: greeting.occasion,
        message: greeting.message,
        theme: greeting.theme,
        scenicDescription: greeting.scenicDescription,
        voice: greeting.voice || VoiceGender.FEMALE, 
        userPhoto: null,
        backgroundMusic: null,
        model: VeoModel.VEO_FAST,
        aspectRatio: AspectRatio.LANDSCAPE,
        extended: false
      }
    });
    setAppState(AppState.SUCCESS);
  };

  const handleInternalShare = async (email: string) => {
    if (!currentResult?.record || !user) return;
    try {
      await sendToInternalUser(user.displayName || "A Friend", email, currentResult.record);
      alert("Sent! This greeting will appear in their library shortly.");
    } catch (err: any) {
      alert("Internal share failed: " + err.message);
    }
  };

  const handleNewScript = () => {
    setEditingGreeting(null);
    setAppState(AppState.IDLE);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-blue-600/30">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => {
        if (window.aistudio) {
          window.aistudio.openSelectKey();
          setIsKeyConnected(true);
          setShowApiKeyDialog(false);
        }
      }} />}

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      
      <header className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => setAppState(user ? AppState.GALLERY : AppState.AUTH)}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform text-white">
            eG
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-white leading-none">eGreetz</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`flex h-2 w-2 rounded-full ${isKeyConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
                {isKeyConnected ? 'Studio Ready' : 'Connect Key'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <button 
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh Library"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Help & Info"
          >
            <HelpCircle size={22} />
          </button>
          {user ? (
            <>
              <button 
                onClick={handleNewScript}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-all font-bold text-sm text-white"
              >
                <Plus size={16} strokeWidth={3} /> New Script
              </button>
              <button onClick={logout} className="p-2 text-gray-500 hover:text-white transition-colors">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-7 py-2.5 bg-white text-black font-black rounded-full hover:bg-gray-200 transition-all text-sm uppercase tracking-wider"
            >
              <LogIn size={16} strokeWidth={3} /> Login
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-6xl mx-auto">
        {!isFirebaseReady && (
          <div className="w-full max-w-4xl mb-6 p-4 bg-red-900/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle size={20} className="text-red-400" />
            <span>Cloud Sync Inactive. Sharing is disabled. Please verify Firebase environment variables.</span>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-3xl animate-in fade-in zoom-in duration-1000">
            <h2 className="text-7xl font-black mb-8 leading-[1] text-white tracking-tighter">Cinematic <span className="text-blue-600">Reimagined.</span></h2>
            <p className="text-2xl text-gray-400 mb-12 leading-relaxed font-medium">Create and host Hollywood-grade video greetings. Permanent cloud storage ensures your links never expire.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={user ? handleNewScript : loginWithGoogle}
                className="px-16 py-6 bg-blue-600 rounded-3xl text-2xl font-black hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 uppercase tracking-widest text-white"
              >
                {user ? 'Start Creating' : 'Login to Start'}
              </button>
              <button 
                onClick={() => setShowHelpModal(true)}
                className="px-8 py-6 bg-white/5 border border-white/10 rounded-3xl text-lg font-bold hover:bg-white/10 transition-all text-gray-300 flex items-center justify-center gap-3"
              >
                <HelpCircle size={24} /> Learn More
              </button>
            </div>
          </div>
        )}

        {appState === AppState.GALLERY && user && (
          <GreetingGallery 
            greetings={myGreetings} 
            receivedGreetings={receivedGreetings}
            onDelete={handleDelete} 
            onEdit={handleEdit}
            onSelect={handleSelectGreeting}
            onCreateNew={handleNewScript}
          />
        )}

        {appState === AppState.IDLE && (
          <div className="w-full flex justify-center py-6">
            <GreetingCreator 
              onGenerate={handleGenerate} 
              onCancel={() => {
                setEditingGreeting(null);
                setAppState(user ? AppState.GALLERY : AppState.AUTH);
              }} 
              initialData={editingGreeting}
            />
          </div>
        )}

        {appState === AppState.LOADING && <LoadingIndicator />}

        {appState === AppState.SUCCESS && currentResult && (
          <GreetingResult 
            result={currentResult} 
            onRestart={handleNewScript} 
            onGoGallery={() => setAppState(user ? AppState.GALLERY : AppState.IDLE)}
            onInternalShare={handleInternalShare}
          />
        )}
      </main>

      <footer className="py-10 text-center text-gray-800 text-xs border-t border-white/5 w-full">
        <p className="font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} eGreetz &bull; Digital Production Studio</p>
      </footer>
    </div>
  );
};

export default App;
