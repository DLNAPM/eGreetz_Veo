
import React, { useState, useEffect } from 'react';
import { loginWithGoogle, logout, getUserGreetings, saveGreeting, deleteGreeting, isFirebaseEnabled, onAuthStateChangedListener, type User } from './services/firebase';
import { AppState, GenerateGreetingParams, GreetingRecord, VeoModel, AspectRatio, VoiceGender } from './types';
import GreetingCreator from './components/GreetingCreator';
import GreetingGallery from './components/GreetingGallery';
import GreetingResult from './components/GreetingResult';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyDialog from './components/ApiKeyDialog';
import { LogIn, LogOut, Plus, ShieldCheck, Key, AlertCircle } from 'lucide-react';
import { generateGreetingVideo } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [greetings, setGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ url: string; params: GenerateGreetingParams } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
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
        loadGreetings(u.uid);
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

  const loadGreetings = async (uid: string) => {
    const data = await getUserGreetings(uid);
    setGreetings(data);
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      alert("Login failed.");
    }
  };

  // Fix: Optimized key selection handling for Veo models, assuming success after triggering openSelectKey.
  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsKeyConnected(true);
      setShowApiKeyDialog(false);
    }
  };

  const handleGenerate = async (params: GenerateGreetingParams & { extended: boolean }) => {
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
      // Pass the extended flag to the service for 15s videos
      const { objectUrl } = await generateGreetingVideo(params);
      
      if (user && isFirebaseReady) {
        try {
          await saveGreeting(user.uid, {
            userId: user.uid,
            occasion: params.occasion,
            message: params.message,
            theme: params.theme,
            videoUrl: objectUrl,
            createdAt: Date.now()
          });
          loadGreetings(user.uid);
        } catch (saveError) {
          console.error("Cloud storage sync failed:", saveError);
        }
      }

      setCurrentResult({ url: objectUrl, params });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Video Generation Error:", e);
      // Fix: Adhering to Gemini rules for "Requested entity was not found" error by resetting state and prompting for key.
      if (e.message?.includes("Requested entity was not found")) {
        setIsKeyConnected(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setIsKeyConnected(true);
        }
      }
      alert("Generation Error: " + e.toString());
      setAppState(AppState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Permanently delete this cinematic greeting?")) {
      try {
        await deleteGreeting(id);
        if (user) loadGreetings(user.uid);
      } catch (error) {
        console.error("Deletion failed:", error);
      }
    }
  };

  const handleSelectGreeting = (greeting: GreetingRecord) => {
    // Populate the viewer with existing greeting data
    setCurrentResult({
      url: greeting.videoUrl,
      params: {
        occasion: greeting.occasion,
        message: greeting.message,
        theme: greeting.theme,
        voice: VoiceGender.FEMALE, 
        userPhoto: null,
        model: VeoModel.VEO_FAST,
        aspectRatio: AspectRatio.LANDSCAPE
      }
    });
    setAppState(AppState.SUCCESS);
  };

  const handleCancelCreator = () => {
    setAppState(user ? AppState.GALLERY : AppState.AUTH);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-blue-600/30">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleConnectKey} />}
      
      <header className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => setAppState(user ? AppState.GALLERY : AppState.AUTH)}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform">
            eG
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-white leading-none">
              eGreetz
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`flex h-2 w-2 rounded-full ${isKeyConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
                {isKeyConnected ? 'Ready for Production' : 'Key Required'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-all font-bold text-sm"
              >
                <Plus size={16} strokeWidth={3} /> New Script
              </button>
              <button onClick={logout} className="p-2 text-gray-500 hover:text-white transition-colors">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-7 py-2.5 bg-white text-black font-black rounded-full hover:bg-gray-200 transition-all text-sm uppercase tracking-wider"
            >
              <LogIn size={16} strokeWidth={3} /> Login
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-6xl mx-auto">
        {!isFirebaseReady && (
          <div className="w-full max-w-4xl mb-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-200 text-sm">
            <AlertCircle size={20} className="text-blue-400" />
            <span>Local Mode: Your greetings will not be saved after page reload.</span>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-3xl animate-in fade-in zoom-in duration-1000">
            <h2 className="text-7xl font-black mb-8 leading-[1] text-white tracking-tighter">Cinematic <span className="text-blue-600">Reimagined.</span></h2>
            <p className="text-2xl text-gray-500 mb-12 leading-relaxed font-medium">Create Hollywood-grade video greetings with automated speed-fit AI voices.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="px-16 py-6 bg-blue-600 rounded-3xl text-2xl font-black hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 uppercase tracking-widest"
              >
                Start Creating
              </button>
            </div>
          </div>
        )}

        {appState === AppState.GALLERY && user && (
          <GreetingGallery 
            greetings={greetings} 
            onDelete={handleDelete} 
            onSelect={handleSelectGreeting}
            onCreateNew={() => setAppState(AppState.IDLE)}
          />
        )}

        {appState === AppState.IDLE && (
          <div className="w-full flex justify-center py-6">
            <GreetingCreator onGenerate={handleGenerate} onCancel={handleCancelCreator} />
          </div>
        )}

        {appState === AppState.LOADING && <LoadingIndicator />}

        {appState === AppState.SUCCESS && currentResult && (
          <GreetingResult 
            result={currentResult} 
            onRestart={() => setAppState(AppState.IDLE)} 
            onGoGallery={() => setAppState(user ? AppState.GALLERY : AppState.IDLE)}
          />
        )}
      </main>

      <footer className="py-10 text-center text-gray-800 text-xs border-t border-white/5 w-full">
        <p className="font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} eGreetz &bull; Production Core</p>
      </footer>
    </div>
  );
};

export default App;
