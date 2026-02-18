import React, { useState, useEffect, useCallback } from 'react';
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
  sendToGroup,
  getGreetingById,
  getSharedGreetingById,
  type User 
} from './services/firebase';
import { AppState, GenerateGreetingParams, GreetingRecord, VeoModel, AspectRatio, VoiceGender, Occasion, GreetingTheme, Speaker } from './types';
import GreetingCreator from './components/GreetingCreator';
import GreetingGallery from './components/GreetingGallery';
import GreetingResult from './components/GreetingResult';
import LoadingIndicator from './components/LoadingIndicator';
import ApiKeyDialog from './components/ApiKeyDialog';
import HelpModal from './components/HelpModal';
import LandingPage from './components/LandingPage';
import ProofStudio from './components/ProofStudio';
import { LogIn, LogOut, Plus, HelpCircle, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { generateGreetingVideo, generateGreetingVoice } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [myGreetings, setMyGreetings] = useState<GreetingRecord[]>([]);
  const [receivedGreetings, setReceivedGreetings] = useState<GreetingRecord[]>([]);
  const [currentResult, setCurrentResult] = useState<{ 
    url: string; 
    params: GenerateGreetingParams; 
    record?: GreetingRecord; 
    audioUrl?: string; 
    voiceUrl?: string; 
    backgroundMusicUrl?: string 
  } | null>(null);
  const [editingGreeting, setEditingGreeting] = useState<GreetingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isKeyConnected, setIsKeyConnected] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  const loadData = useCallback(async (u: User) => {
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
  }, []);

  // Update theme class on body based on state
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      if (appState === AppState.AUTH) {
        root.classList.add('landing-mode');
      } else {
        root.classList.remove('landing-mode');
      }
    }
  }, [appState]);

  useEffect(() => {
    const init = async () => {
      setIsFirebaseReady(isFirebaseEnabled());
      
      // Check for Short URL parameters (?v=ID or ?s=ID)
      const urlParams = new URLSearchParams(window.location.search);
      const greetingId = urlParams.get('v');
      const sharedId = urlParams.get('s');

      if (greetingId || sharedId) {
        setIsLoading(true);
        try {
          const record = greetingId 
            ? await getGreetingById(greetingId) 
            : await getSharedGreetingById(sharedId!);
          
          if (record) {
            setCurrentResult({
              url: record.videoUrl,
              record,
              voiceUrl: record.voiceUrl,
              backgroundMusicUrl: record.backgroundMusicUrl,
              params: {
                title: record.title,
                occasion: record.occasion,
                message: record.message,
                theme: record.theme,
                scenicDescription: record.scenicDescription,
                voice: record.voice || VoiceGender.FEMALE,
                speaker: record.speaker || Speaker.MODERATOR,
                userPhoto: null,
                scenePhoto: null,
                backgroundMusic: null,
                model: VeoModel.VEO_FAST,
                aspectRatio: AspectRatio.LANDSCAPE,
                extended: false,
                trimStart: record.trimStart,
                trimEnd: record.trimEnd,
                fadeOut: record.fadeOut
              }
            });
            setAppState(AppState.VIEWER);
          } else {
            console.warn("Greeting not found");
          }
        } catch (err) {
          console.error("Error loading viewer:", err);
        } finally {
          setIsLoading(false);
        }
      }
      
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
      setIsAuthInitializing(false);
      
      // Only change state from AUTH if not already in VIEWER or SUCCESS
      const urlParams = new URLSearchParams(window.location.search);
      const hasLink = urlParams.has('v') || urlParams.has('s');
      
      if (u) {
        loadData(u);
        if (!hasLink) setAppState(AppState.GALLERY);
      } else {
        if (!hasLink) setAppState(AppState.AUTH);
      }
    });
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadData]);

  const handleRefresh = () => {
    if (user) loadData(user);
  };

  const handleGenerate = async (params: GenerateGreetingParams) => {
    if (!user) {
      alert("Please login to create cinematic greetings.");
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
      const [videoResult, voiceResult] = await Promise.all([
        generateGreetingVideo(params),
        generateGreetingVoice(params)
      ]);
      
      let videoUrl = "";
      let voiceUrl = "";
      let musicUrl = "";
      let newRecord: GreetingRecord | undefined;

      if (isFirebaseReady) {
        const uploads: Promise<string>[] = [
          uploadVideoToCloud(videoResult.blob, user.uid)
        ];
        
        if (voiceResult) {
          uploads.push(uploadAudioToCloud(voiceResult.blob, user.uid));
        }
        
        if (params.backgroundMusic) {
          uploads.push(uploadAudioToCloud(params.backgroundMusic.file, user.uid));
        }

        const results = await Promise.all(uploads);
        videoUrl = results[0];
        
        let idx = 1;
        if (voiceResult) {
          voiceUrl = results[idx++];
        }

        if (params.backgroundMusic) {
          musicUrl = results[idx++];
        } else {
          musicUrl = editingGreeting?.backgroundMusicUrl || "";
        }
        
        const recordData = {
          title: params.occasion, // Default title
          occasion: params.occasion,
          message: params.message,
          theme: params.theme,
          scenicDescription: params.scenicDescription,
          videoUrl: videoUrl,
          voice: params.voice,
          speaker: params.speaker,
          voiceUrl: voiceUrl,
          backgroundMusicUrl: musicUrl
        };

        if (editingGreeting) {
          await updateGreeting(editingGreeting.id, recordData);
          newRecord = { ...editingGreeting, ...recordData };
        } else {
          const docRef = await saveGreeting(user.uid, {
            ...recordData,
            userId: user.uid,
            createdAt: Date.now()
          });
          newRecord = { id: docRef.id, userId: user.uid, ...recordData, createdAt: Date.now() };
        }
        loadData(user);
      } else {
        videoUrl = URL.createObjectURL(videoResult.blob);
        voiceUrl = voiceResult ? `data:audio/pcm;base64,${voiceResult.base64}` : "";
        musicUrl = params.backgroundMusic ? URL.createObjectURL(params.backgroundMusic.file) : "";
      }

      setCurrentResult({ 
        url: videoUrl, 
        params, 
        record: newRecord,
        voiceUrl: voiceUrl,
        backgroundMusicUrl: musicUrl
      });
      setAppState(AppState.SUCCESS);
    } catch (e: any) {
      console.error("Production Error:", e);
      if (e.message?.includes("API Key") || e.message?.includes("not found")) {
        alert("Session or API key expired. Please re-select your Paid API Key.");
        if (window.aistudio) {
          setIsKeyConnected(false);
          setShowApiKeyDialog(true);
        }
      } else {
        alert("Production Error: " + e.message);
      }
      setAppState(user ? AppState.GALLERY : AppState.IDLE);
    } finally {
      setIsLoading(false);
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
      voiceUrl: greeting.voiceUrl,
      backgroundMusicUrl: greeting.backgroundMusicUrl,
      params: {
        title: greeting.title,
        occasion: greeting.occasion,
        message: greeting.message,
        theme: greeting.theme,
        scenicDescription: greeting.scenicDescription,
        voice: greeting.voice || VoiceGender.FEMALE,
        speaker: greeting.speaker || Speaker.MODERATOR, 
        userPhoto: null,
        scenePhoto: null,
        backgroundMusic: null,
        model: VeoModel.VEO_FAST,
        aspectRatio: AspectRatio.LANDSCAPE,
        extended: false,
        trimStart: greeting.trimStart,
        trimEnd: greeting.trimEnd,
        fadeOut: greeting.fadeOut
      }
    });
    setAppState(AppState.SUCCESS);
  };

  // Proof Studio Logic
  const handleProofSave = async (updatedParams: GenerateGreetingParams, newVoiceBlob?: Blob, newMusicFile?: File, asCopy: boolean = false) => {
    if (!user || !currentResult) return;
    setIsLoading(true);

    try {
        let voiceUrl = currentResult.voiceUrl;
        let musicUrl = currentResult.backgroundMusicUrl;

        // Upload new voice if generated
        if (newVoiceBlob && isFirebaseReady) {
            voiceUrl = await uploadAudioToCloud(newVoiceBlob, user.uid);
        } else if (newVoiceBlob) {
            // Local fallback
            voiceUrl = URL.createObjectURL(newVoiceBlob);
        }

        // Upload new music if selected
        if (newMusicFile && isFirebaseReady) {
            musicUrl = await uploadAudioToCloud(newMusicFile, user.uid);
        } else if (newMusicFile) {
            // Local fallback
            musicUrl = URL.createObjectURL(newMusicFile);
        }

        const recordData = {
            title: updatedParams.title || updatedParams.occasion,
            occasion: updatedParams.occasion,
            message: updatedParams.message,
            theme: updatedParams.theme,
            scenicDescription: updatedParams.scenicDescription,
            videoUrl: currentResult.url,
            voice: updatedParams.voice,
            speaker: updatedParams.speaker,
            voiceUrl: voiceUrl,
            backgroundMusicUrl: musicUrl,
            trimStart: updatedParams.trimStart,
            trimEnd: updatedParams.trimEnd,
            fadeOut: updatedParams.fadeOut
        };

        let finalRecord: GreetingRecord;

        if (isFirebaseReady) {
            if (asCopy) {
                // Create New
                 const docRef = await saveGreeting(user.uid, {
                    ...recordData,
                    userId: user.uid,
                    createdAt: Date.now()
                });
                finalRecord = { id: docRef.id, userId: user.uid, ...recordData, createdAt: Date.now() };
            } else if (currentResult.record) {
                // Update Existing
                await updateGreeting(currentResult.record.id, recordData);
                finalRecord = { ...currentResult.record, ...recordData };
            } else {
                 // Save for first time (if currentResult was transient)
                 const docRef = await saveGreeting(user.uid, {
                    ...recordData,
                    userId: user.uid,
                    createdAt: Date.now()
                });
                finalRecord = { id: docRef.id, userId: user.uid, ...recordData, createdAt: Date.now() };
            }
            loadData(user);
        } else {
            // Offline/Transient mode
            finalRecord = { 
                id: 'transient', 
                userId: 'local', 
                createdAt: Date.now(), 
                ...recordData 
            } as GreetingRecord;
        }

        // Update current result state
        setCurrentResult({
            url: currentResult.url,
            params: updatedParams,
            record: finalRecord,
            voiceUrl: voiceUrl,
            backgroundMusicUrl: musicUrl
        });

        setAppState(AppState.SUCCESS);

    } catch (e: any) {
        console.error("Proof Save Failed:", e);
        alert("Failed to save proof edits.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleInternalShare = async (recipients: string[]) => {
    if (!currentResult?.record || !user) return;
    try {
      if (recipients.length === 1) {
        await sendToInternalUser(user.displayName || "Friend", recipients[0], currentResult.record);
      } else {
        await sendToGroup(user.displayName || "Friend", recipients, currentResult.record);
      }
      alert(`Greeting shared with ${recipients.length} ${recipients.length === 1 ? 'recipient' : 'recipients'}!`);
    } catch (err: any) {
      console.error("Share failed:", err);
      alert("Failed to share greeting.");
    }
  };

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pure Viewer Mode (Public)
  if (appState === AppState.VIEWER && currentResult) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl text-center mb-8">
           <div className="inline-flex p-3 bg-blue-600/20 rounded-2xl text-blue-500 mb-4">
              <Sparkles size={24} />
           </div>
           <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">You've received a greeting!</h1>
        </div>
        <GreetingResult 
          result={currentResult} 
          onRestart={() => setAppState(user ? AppState.GALLERY : AppState.AUTH)} 
          onGoGallery={() => setAppState(AppState.GALLERY)}
          isViewerOnly={true}
        />
        {!user && (
          <button 
            onClick={loginWithGoogle}
            className="mt-12 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Create Your Own eGreetz
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-600/30 transition-colors">
      {showApiKeyDialog && <ApiKeyDialog onContinue={() => {
        if (window.aistudio) {
          window.aistudio.openSelectKey();
          setIsKeyConnected(true);
          setShowApiKeyDialog(false);
        }
      }} />}

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      
      {appState !== AppState.AUTH && (
        <header className="px-6 py-5 flex justify-between items-center border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => {
              // Reset URL when going home
              window.history.pushState({}, '', '/');
              setAppState(user ? AppState.GALLERY : AppState.AUTH);
            }}
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform text-white">eG</div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight text-white leading-none">eGreetz</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`flex h-2 w-2 rounded-full ${isKeyConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{isKeyConnected ? 'Studio Ready' : 'Connect Key'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-white transition-colors">
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button onClick={() => setShowHelpModal(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <HelpCircle size={22} />
            </button>
            {user ? (
              <>
                <button onClick={() => { setEditingGreeting(null); setAppState(AppState.IDLE); }} className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-all font-bold text-sm text-white">
                  <Plus size={16} strokeWidth={3} /> New Script
                </button>
                <button onClick={logout} className="p-2 text-gray-500 hover:text-white transition-colors"><LogOut size={20} /></button>
              </>
            ) : (
              <button onClick={loginWithGoogle} className="flex items-center gap-2 px-7 py-2.5 bg-white text-black font-black rounded-full hover:bg-gray-200 transition-all text-sm uppercase tracking-wider">
                <LogIn size={16} strokeWidth={3} /> Login
              </button>
            )}
          </div>
        </header>
      )}

      <main className={`flex-grow flex flex-col items-center w-full ${appState === AppState.AUTH ? '' : 'p-6 max-w-6xl mx-auto'}`}>
        {appState !== AppState.AUTH && !isFirebaseReady && (
          <div className="w-full max-w-4xl mb-6 p-4 bg-red-900/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle size={20} className="text-red-400" />
            <span>Cloud Sync Inactive. Sharing is limited.</span>
          </div>
        )}

        {appState === AppState.AUTH ? (
          <LandingPage onLogin={loginWithGoogle} />
        ) : (
          <>
            {appState === AppState.GALLERY && user && (
              <div className="w-full h-full flex flex-col">
                <GreetingGallery 
                  greetings={myGreetings} 
                  receivedGreetings={receivedGreetings}
                  onDelete={async (id) => { if(window.confirm("Delete?")) { await deleteGreeting(id); loadData(user); } }} 
                  onEdit={handleEdit}
                  onSelect={handleSelectGreeting}
                  onCreateNew={() => { setEditingGreeting(null); setAppState(AppState.IDLE); }}
                />
              </div>
            )}

            {appState === AppState.IDLE && (
              <div className="w-full flex justify-center py-6">
                <GreetingCreator 
                  onGenerate={handleGenerate} 
                  onCancel={() => setAppState(user ? AppState.GALLERY : AppState.AUTH)} 
                  initialData={editingGreeting}
                />
              </div>
            )}

            {appState === AppState.LOADING && <LoadingIndicator />}

            {appState === AppState.PROOF_STUDIO && currentResult && (
               <div className="w-full flex justify-center py-6">
                 <ProofStudio
                    initialParams={currentResult.params}
                    videoUrl={currentResult.url}
                    initialVoiceUrl={currentResult.voiceUrl}
                    initialMusicUrl={currentResult.backgroundMusicUrl}
                    onSave={(p, v, m) => handleProofSave(p, v, m, false)}
                    onSaveCopy={(p, v, m) => handleProofSave(p, v, m, true)}
                    onCancel={() => setAppState(AppState.SUCCESS)}
                 />
               </div>
            )}

            {appState === AppState.SUCCESS && currentResult && (
              <GreetingResult 
                result={currentResult} 
                onRestart={() => { setEditingGreeting(null); setAppState(AppState.IDLE); }} 
                onGoGallery={() => setAppState(AppState.GALLERY)}
                onInternalShare={handleInternalShare}
                onEdit={() => setAppState(AppState.PROOF_STUDIO)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;