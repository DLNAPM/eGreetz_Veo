
import React, { useState, useEffect } from 'react';
import { 
  loginWithGoogle, 
  logout, 
  getUserGreetings, 
  saveGreeting, 
  deleteGreeting, 
  isFirebaseEnabled, 
  onAuthStateChangedListener,
  uploadVideoToCloud,
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
import { LogIn, LogOut, Plus, ShieldCheck, Key, AlertCircle } from 'lucide-react';
import { generateGreetingVideo } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [myGreetings, setMyGreetings] = useState<GreetingRecord[]>([]);
  const [receivedGreetings, setReceivedGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ url: string; params: GenerateGreetingParams; record?: GreetingRecord } | null>(null);
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
    const [mine, received] = await Promise.all([
      getUserGreetings(u.uid),
      u.email ? getReceivedGreetings(u.email) : Promise.resolve([])
    ]);
    setMyGreetings(mine);
    setReceivedGreetings(received);
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
      const { blob } = await generateGreetingVideo(params);
      
      let finalUrl = "";
      let newRecord: GreetingRecord | undefined;

      if (user && isFirebaseReady) {
        // Step 1: Upload to Cloud Storage to get a permanent shareable URL
        finalUrl = await uploadVideoToCloud(blob, user.uid);

        // Step 2: Save metadata to Firestore
        const docRef = await saveGreeting(user.uid, {
          userId: user.uid,
          occasion: params.occasion,
          message: params.message,
          theme: params.theme,
          videoUrl: finalUrl,
          createdAt: Date.now()
        });

        newRecord = {
          id: docRef.id,
          userId: user.uid,
          occasion: params.occasion,
          message: params.message,
          theme: params.theme,
          videoUrl: finalUrl,
          createdAt: Date.now()
        };

        loadData(user);
      } else {
        // Fallback for non-logged in or firebase error
        finalUrl = URL.createObjectURL(blob);
      }

      setCurrentResult({ url: finalUrl, params, record: newRecord });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Video Generation Error:", e);
      if (e.message?.includes("Requested entity was not found")) {
        setIsKeyConnected(false);
        if (window.aistudio) await window.aistudio.openSelectKey();
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
        if (user) loadData(user);
      } catch (error) {
        console.error("Deletion failed:", error);
      }
    }
  };

  const handleSelectGreeting = (greeting: GreetingRecord) => {
    setCurrentResult({
      url: greeting.videoUrl,
      record: greeting,
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

  const handleInternalShare = async (email: string) => {
    if (!currentResult?.record || !user) return;
    try {
      await sendToInternalUser(user.displayName || "A Friend", email, currentResult.record);
      alert("Cinematic greeting sent to " + email);
    } catch (err: any) {
      alert("Share failed: " + err.message);
    }
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
          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
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
            <span>Cloud Services Disconnected. Sharing will not work. Check VITE_FIREBASE_CONFIG.</span>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-3xl animate-in fade-in zoom-in duration-1000">
            <h2 className="text-7xl font-black mb-8 leading-[1] text-white tracking-tighter">Cinematic <span className="text-blue-600">Reimagined.</span></h2>
            <p className="text-2xl text-gray-400 mb-12 leading-relaxed font-medium">Create and host Hollywood-grade video greetings. Permanent cloud links ready for sharing.</p>
            <button 
              onClick={() => setAppState(AppState.IDLE)}
              className="px-16 py-6 bg-blue-600 rounded-3xl text-2xl font-black hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 uppercase tracking-widest text-white"
            >
              Start Creating
            </button>
          </div>
        )}

        {appState === AppState.GALLERY && user && (
          <GreetingGallery 
            greetings={myGreetings} 
            receivedGreetings={receivedGreetings}
            onDelete={handleDelete} 
            onSelect={handleSelectGreeting}
            onCreateNew={() => setAppState(AppState.IDLE)}
          />
        )}

        {appState === AppState.IDLE && (
          <div className="w-full flex justify-center py-6">
            <GreetingCreator onGenerate={handleGenerate} onCancel={() => setAppState(user ? AppState.GALLERY : AppState.AUTH)} />
          </div>
        )}

        {appState === AppState.LOADING && <LoadingIndicator />}

        {appState === AppState.SUCCESS && currentResult && (
          <GreetingResult 
            result={currentResult} 
            onRestart={() => setAppState(AppState.IDLE)} 
            onGoGallery={() => setAppState(user ? AppState.GALLERY : AppState.IDLE)}
            onInternalShare={handleInternalShare}
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
