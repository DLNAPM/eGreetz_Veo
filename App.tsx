
import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, getUserGreetings, saveGreeting, deleteGreeting, isFirebaseEnabled, onAuthStateChangedListener, type User } from './services/firebase';
import { AppState, GenerateGreetingParams, GreetingRecord, Occasion, GreetingTheme, VoiceGender, VeoModel, AspectRatio } from './types';
import GreetingCreator from './components/GreetingCreator';
import GreetingGallery from './components/GreetingGallery';
import GreetingResult from './components/GreetingResult';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyDialog from './components/ApiKeyDialog';
import { LogIn, LogOut, Plus, AlertCircle } from 'lucide-react';
import { generateGreetingVideo } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [greetings, setGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ url: string; params: GenerateGreetingParams } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseEnabled()) {
      setFirebaseError("Cloud collection is in demo mode.");
      setAppState(AppState.IDLE);
      return;
    }

    const unsubscribe = onAuthStateChangedListener(async (u) => {
      setUser(u);
      if (u) {
        loadGreetings(u.uid);
        setAppState(prev => (prev === AppState.AUTH ? AppState.GALLERY : prev));
      } else {
        setAppState(AppState.AUTH);
      }
    });
    return unsubscribe;
  }, []);

  const loadGreetings = async (uid: string) => {
    if (!isFirebaseEnabled()) return;
    const data = await getUserGreetings(uid);
    setGreetings(data);
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
          console.error("Save to Firestore failed:", saveError);
        }
      }

      setCurrentResult({ url: objectUrl, params });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Video Generation Error:", e);
      
      const errorMessage = e.message || "An unexpected error occurred.";
      const isApiKeyError = errorMessage.toLowerCase().includes("api key") || 
                           errorMessage.includes("Requested entity was not found") ||
                           errorMessage.includes("not set") ||
                           errorMessage.includes("API Key is required");

      if (isApiKeyError && window.aistudio) {
        // GUIDELINE: If the request fails with an error message containing "Requested entity was not found.", 
        // prompt the user to select a key again via openSelectKey().
        await window.aistudio.openSelectKey();
      } else if (isApiKeyError) {
        alert("Authentication Error: The API Key is missing or invalid. Please click the button to select a paid API key for Veo generation.");
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        alert("Generation failed: " + errorMessage);
      }
      
      setAppState(AppState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this greeting permanently?")) {
      try {
        await deleteGreeting(id);
        if (user) loadGreetings(user.uid);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => { setShowApiKeyDialog(false); window.aistudio?.openSelectKey(); }} />}
      
      <header className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => (user || !isFirebaseEnabled()) && setAppState(user ? AppState.GALLERY : AppState.IDLE)}
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:scale-105 transition-transform">
            eG
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white ml-1">
            eGreetz
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all font-bold text-sm shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} /> New Greeting
              </button>
              <button 
                onClick={logout}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : isFirebaseEnabled() ? (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all text-sm"
            >
              <LogIn size={16} /> Login
            </button>
          ) : (
            <button 
              onClick={() => setAppState(AppState.IDLE)}
              className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 transition-all text-sm shadow-lg shadow-indigo-600/20"
            >
              <Plus size={16} /> Create Now
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-6xl mx-auto">
        {firebaseError && (appState === AppState.IDLE || appState === AppState.AUTH) && (
          <div className="w-full max-w-4xl mb-8 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-400 text-sm">
            <AlertCircle className="shrink-0" size={18} />
            <p>{firebaseError}</p>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-2xl animate-in fade-in zoom-in duration-1000">
            <h2 className="text-6xl font-black mb-8 leading-[1.1] text-white">Cinematic Greetings for Special Moments</h2>
            <p className="text-2xl text-gray-500 mb-10 leading-relaxed">Personalize your wishes with high-end AI video and unique voices. Join eGreetz today.</p>
            <button 
              onClick={isFirebaseEnabled() ? loginWithGoogle : () => setAppState(AppState.IDLE)}
              className="px-14 py-5 bg-indigo-600 rounded-3xl text-2xl font-black hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/40 hover:-translate-y-1 active:scale-95"
            >
              {isFirebaseEnabled() ? 'Sign in with Google' : 'Get Started Now'}
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

        <div className={(appState === AppState.IDLE) ? "w-full flex justify-center py-10" : "hidden"}>
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

      <footer className="py-8 text-center text-gray-700 text-xs border-t border-white/5 w-full">
        <p>&copy; {new Date().getFullYear()} eGreetz. Powered by Google AI (Gemini & Veo).</p>
      </footer>
    </div>
  );
};

export default App;
