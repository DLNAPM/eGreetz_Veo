import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, loginWithGoogle, logout, getUserGreetings, saveGreeting, deleteGreeting, isFirebaseEnabled } from './services/firebase';
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
      setFirebaseError("Firebase configuration is missing or invalid. Please check your environment variables (VITE_FIREBASE_CONFIG).");
      setAppState(AppState.IDLE);
      return;
    }

    const unsubscribe = auth!.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        setAppState(AppState.GALLERY);
        loadGreetings(u.uid);
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
      if (!(await window.aistudio.hasSelectedApiKey())) {
        setShowApiKeyDialog(true);
        return;
      }
    }

    setIsLoading(true);
    setAppState(AppState.LOADING);
    try {
      const { objectUrl } = await generateGreetingVideo(params);
      
      if (user && isFirebaseEnabled()) {
        await saveGreeting(user.uid, {
          userId: user.uid,
          occasion: params.occasion,
          message: params.message,
          theme: params.theme,
          videoUrl: objectUrl,
          createdAt: Date.now()
        });
        loadGreetings(user.uid);
      }

      setCurrentResult({ url: objectUrl, params });
      setAppState(AppState.SUCCESS);
    } catch (e) {
      console.error(e);
      setAppState(user ? AppState.GALLERY : AppState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this greeting?")) {
      await deleteGreeting(id);
      if (user) loadGreetings(user.uid);
    }
  };

  const handleApiKeyDialogContinue = async () => {
    setShowApiKeyDialog(false);
    if (window.aistudio) await window.aistudio.openSelectKey();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />}
      
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => (user || !isFirebaseEnabled()) && setAppState(user ? AppState.GALLERY : AppState.IDLE)}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
            eG
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            eGreetz
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {firebaseError && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full border border-yellow-500/20">
              <AlertCircle size={14} /> Demo Mode (No Cloud Sync)
            </div>
          )}
          {user ? (
            <>
              <button 
                onClick={() => setAppState(AppState.IDLE)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all font-medium text-sm"
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
        {firebaseError && (
          <div className="w-full max-w-3xl mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-yellow-500 text-sm">
            <AlertCircle className="shrink-0" />
            <p>{firebaseError}</p>
          </div>
        )}

        {appState === AppState.AUTH && isFirebaseEnabled() && (
          <div className="flex-grow flex flex-col items-center justify-center text-center max-w-lg">
            <h2 className="text-5xl font-extrabold mb-6 leading-tight">Cinematic Greetings for Special Moments</h2>
            <p className="text-xl text-gray-400 mb-8">Personalize your wishes with high-end AI video and unique voices. Log in to start creating.</p>
            <button 
              onClick={loginWithGoogle}
              className="px-10 py-4 bg-indigo-600 rounded-2xl text-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
            >
              Sign in with Google
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

        {appState === AppState.IDLE && (
          <GreetingCreator onGenerate={handleGenerate} />
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

      <footer className="py-6 text-center text-gray-600 text-sm border-t border-white/5">
        &copy; {new Date().getFullYear()} eGreetz. Powered by Gemini & Veo.
      </footer>
    </div>
  );
};

export default App;