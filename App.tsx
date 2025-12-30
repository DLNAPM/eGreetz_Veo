
import React, { useState, useEffect } from 'react';
import { loginWithGoogle, logout, getUserGreetings, saveGreeting, deleteGreeting, isFirebaseEnabled, onAuthStateChangedListener, type User } from './services/firebase';
import { AppState, GenerateGreetingParams, GreetingRecord, VeoModel, AspectRatio } from './types';
import GreetingCreator from './components/GreetingCreator';
import GreetingGallery from './components/GreetingGallery';
import GreetingResult from './components/GreetingResult';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyDialog from './components/ApiKeyDialog';
import { LogIn, LogOut, Plus, ShieldCheck, Cpu, Key } from 'lucide-react';
import { generateGreetingVideo } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [greetings, setGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ url: string; params: GenerateGreetingParams } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [isKeyConnected, setIsKeyConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'none'>('none');

  useEffect(() => {
    const checkKeyStatus = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyConnected(hasKey);
      } else if (process.env.API_KEY) {
        setIsKeyConnected(true);
      }
    };
    
    checkKeyStatus();
    if (isFirebaseEnabled()) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('error');
    }

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
    if (!isFirebaseEnabled()) return;
    const data = await getUserGreetings(uid);
    setGreetings(data);
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login Error:", err);
      alert(err.message || "Failed to log in. Please try again.");
    }
  };

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsKeyConnected(true);
    }
  };

  const handleGenerate = async (params: GenerateGreetingParams) => {
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
      const { objectUrl } = await generateGreetingVideo(params);
      
      if (user && isFirebaseEnabled()) {
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
      const errorMessage = e.toString();
      
      const isApiKeyError = 
        errorMessage.toLowerCase().includes("api key") || 
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("not set") ||
        errorMessage.includes("API Key is required");

      if (isApiKeyError && window.aistudio) {
        setIsKeyConnected(false);
        await window.aistudio.openSelectKey();
        setIsKeyConnected(true);
      } else {
        alert("Generation Interrupted: " + errorMessage);
      }
      
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

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans selection:bg-blue-600/30">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => { setShowApiKeyDialog(false); handleConnectKey(); }} />}
      
      <header className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => (user || !isFirebaseEnabled()) && setAppState(user ? AppState.GALLERY : AppState.IDLE)}
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
              <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase flex items-center gap-1">
                {isKeyConnected ? 'System Ready' : 'Key Selection Required'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isKeyConnected && window.aistudio && (
            <button 
              onClick={handleConnectKey}
              className="hidden md:flex items-center gap-2 px-4 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
            >
              <Key size={14} /> Connect Cloud Billing
            </button>
          )}

          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-all font-bold text-sm shadow-lg shadow-blue-600/30"
              >
                <Plus size={16} strokeWidth={3} /> Create New
              </button>
              <button 
                onClick={logout}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : isFirebaseEnabled() ? (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-7 py-2.5 bg-white text-black font-black rounded-full hover:bg-gray-200 transition-all text-sm uppercase tracking-wider"
            >
              <LogIn size={16} strokeWidth={3} /> Account Login
            </button>
          ) : (
            <button 
              onClick={() => setAppState(AppState.IDLE)}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-full hover:bg-blue-500 transition-all text-sm shadow-xl shadow-blue-600/30"
            >
              <Plus size={16} strokeWidth={3} /> Start Creating
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-6xl mx-auto">
        {connectionStatus === 'connected' && (appState === AppState.IDLE || appState === AppState.AUTH) && (
          <div className="w-full max-w-4xl mb-10 p-5 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-xl">
                <ShieldCheck className="text-blue-400" size={24} />
              </div>
              <div>
                <h4 className="font-black text-blue-100 text-sm uppercase tracking-widest">Enterprise Production Active</h4>
                <p className="text-blue-400/80 text-xs mt-0.5 font-medium">Cloud storage and generation clusters are fully operational.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <Cpu size={12} className="text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">GPU Optimized</span>
            </div>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-3xl animate-in fade-in zoom-in duration-1000">
            <h2 className="text-7xl font-black mb-8 leading-[1] text-white tracking-tighter">Cinematic Greeting <span className="text-blue-600">Reimagined.</span></h2>
            <p className="text-2xl text-gray-500 mb-12 leading-relaxed font-medium">Generate Hollywood-grade video greetings with custom AI voices and personalized visuals in seconds.</p>
            <button 
              onClick={isFirebaseEnabled() ? handleLogin : () => setAppState(AppState.IDLE)}
              className="px-16 py-6 bg-blue-600 rounded-3xl text-2xl font-black hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
            >
              {isFirebaseEnabled() ? 'Access Secure Portal' : 'Initialize Creator'}
            </button>
          </div>
        )}

        {appState === AppState.GALLERY && user && (
          <GreetingGallery 
            greetings={greetings} 
            onDelete={handleDelete} 
            onCreateNew={() => setAppState(AppState.IDLE)}
          />
        )}

        <div className={(appState === AppState.IDLE) ? "w-full flex justify-center py-6" : "hidden"}>
          <GreetingCreator onGenerate={handleGenerate} />
        </div>

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
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} eGreetz &bull; Production Core v2.1</p>
          <p className="opacity-50">Enterprise Environment powered by Google Cloud & DeepMind GenAI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
