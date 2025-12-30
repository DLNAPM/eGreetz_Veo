
import React, { useState, useEffect } from 'react';
// Fix: Use 'import type' for User to ensure compatibility with all TS versions and module resolution settings
import type { User } from 'firebase/auth';
import { auth, loginWithGoogle, logout, getUserGreetings, saveGreeting, deleteGreeting, isFirebaseEnabled, onAuthStateChangedListener } from './services/firebase';
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
      setFirebaseError("Firebase is currently in demo mode. Your greetings won't be saved to the cloud.");
      setAppState(AppState.IDLE);
      return;
    }

    const unsubscribe = onAuthStateChangedListener(async (u) => {
      setUser(u);
      
      if (u) {
        loadGreetings(u.uid);
        // CRITICAL: Only transition to GALLERY if we are currently at the AUTH screen.
        // This prevents the app from resetting state during generation or while on the creator.
        setAppState(prev => {
          if (prev === AppState.AUTH) return AppState.GALLERY;
          return prev;
        });
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
    // 1. Check for AI Studio environment and API Key selection
    if (window.aistudio) {
      if (!(await window.aistudio.hasSelectedApiKey())) {
        setShowApiKeyDialog(true);
        return;
      }
    }

    // 2. Start generation flow
    setIsLoading(true);
    setAppState(AppState.LOADING);
    
    try {
      const { objectUrl } = await generateGreetingVideo(params);
      
      // Save to cloud if user is logged in
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
          console.error("Cloud save failed, but video was generated successfully:", saveError);
        }
      }

      setCurrentResult({ url: objectUrl, params });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Video Generation Error:", e);
      
      // Handle missing entity or key errors by prompting for key again as per guidelines
      const errorMessage = e.message || "Unknown error";
      if (errorMessage.includes("Requested entity was not found") || 
          errorMessage.includes("API Key") || 
          errorMessage.includes("not set")) {
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        } else {
          alert(`Configuration Error: ${errorMessage}. Please check your API Key.`);
        }
      } else {
        alert("Failed to generate greeting: " + errorMessage);
      }
      
      // Return to IDLE state so the user can see the form again (which is preserved via 'hidden' class)
      setAppState(AppState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this greeting? This cannot be undone.")) {
      try {
        await deleteGreeting(id);
        if (user) loadGreetings(user.uid);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Proceed logic: after triggering dialog, guidelines say to assume success and proceed.
      // We stay on the IDLE state so the user can click the generate button again.
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />}
      
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => (user || !isFirebaseEnabled()) && setAppState(user ? AppState.GALLERY : AppState.IDLE)}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            eG
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            eGreetz
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all font-medium text-sm shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} /> New Greeting
              </button>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : isFirebaseEnabled() ? (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all text-sm"
            >
              <LogIn size={16} /> Login
            </button>
          ) : (
            <button 
              onClick={() => setAppState(AppState.IDLE)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-500 transition-all text-sm"
            >
              <Plus size={16} /> Create Now
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 w-full max-w-6xl mx-auto">
        {firebaseError && (appState === AppState.IDLE || appState === AppState.AUTH) && (
          <div className="w-full max-w-3xl mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-yellow-500 text-sm">
            <AlertCircle className="shrink-0" />
            <p>{firebaseError}</p>
          </div>
        )}

        {appState === AppState.AUTH && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-lg animate-in fade-in zoom-in duration-1000">
            <h2 className="text-5xl font-extrabold mb-6 leading-tight">Cinematic Greetings for Special Moments</h2>
            <p className="text-xl text-gray-400 mb-8">Personalize your wishes with high-end AI video and unique voices. Log in to start creating.</p>
            {isFirebaseEnabled() ? (
              <button 
                onClick={loginWithGoogle}
                className="px-10 py-4 bg-indigo-600 rounded-2xl text-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 hover:-translate-y-1"
              >
                Sign in with Google
              </button>
            ) : (
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="px-10 py-4 bg-indigo-600 rounded-2xl text-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 hover:-translate-y-1"
              >
                Get Started
              </button>
            )}
          </div>
        )}

        {appState === AppState.GALLERY && user && (
          <GreetingGallery 
            greetings={greetings} 
            onDelete={handleDelete} 
            onCreateNew={() => setAppState(AppState.IDLE)}
          />
        )}

        {/* 
          CRITICAL: We use 'hidden' class instead of conditional mounting {appState === AppState.IDLE && ...}
          to preserve the GreetingCreator's internal form state when transitioning to LOADING/SUCCESS/ERROR.
          This prevents the "start over" bug where users lose their message if something fails.
        */}
        <div className={(appState === AppState.IDLE) ? "w-full flex justify-center" : "hidden"}>
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

      <footer className="py-6 text-center text-gray-600 text-sm border-t border-white/5 w-full">
        <p>&copy; {new Date().getFullYear()} eGreetz. Powered by Gemini & Veo.</p>
      </footer>
    </div>
  );
};

export default App;
