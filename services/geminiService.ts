import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel, Occasion, GreetingTheme } from '../types';

/**
 * Helper to decode base64 audio and get its duration in seconds.
 */
async function getAudioDuration(base64Data: string): Promise<number> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // PCM 16bit 24kHz Mono is 2 bytes per sample
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    return 10;
  }
}

/**
 * Robust polling for Veo operations with a retry mechanism for transient API errors.
 */
async function pollOperation(ai: any, initialOp: any, maxRetries = 3): Promise<any> {
  let operation = initialOp;
  let retryCount = 0;

  while (!operation.done) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      
      if (operation.error) {
        // Handle transient 500s or "Internal Server Issue"
        if (operation.error.code === 500 || operation.error.message?.includes("internal server issue")) {
          if (retryCount < maxRetries) {
            console.warn(`[Studio] Transient API error detected. Retrying poll... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            continue; 
          }
        }
        throw new Error(operation.error.message);
      }
    } catch (e: any) {
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  return operation;
}

/**
 * Generates a cinematic greeting video with phonetic lip-sync and enforced silence.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const audioDuration = params.audioDuration || 7;
  // Director's Rule: Ensure visual buffer of 3.5s beyond spoken audio.
  let targetDuration = Math.ceil(audioDuration) + 3.5; 
  
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const hasReferences = !!(params.userPhoto || params.scenePhoto);
  const needsExtension = targetDuration > segmentLength;
  
  const modelToUse = (needsExtension || hasReferences) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
  const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

  const baseCinematicInstruction = `
    MASTER PRODUCTION: ${params.occasion !== Occasion.NONE ? params.occasion : 'Cinematic Masterpiece'}.
    ENVIRONMENT: ${environment}. 
    LIGHTING: Professional cinematic lighting, detailed textures, 8k resolution.
    CRITICAL: THE OUTPUT FILE MUST BE SILENT. NO AUDIO.
  `.trim();

  const lipSyncInstruction = params.userPhoto 
    ? `CHARACTER: The character from the reference image is speaking. PERFORMANCE: Lips, jaw, and facial muscles must move in perfect phonetic sync with this script: "${params.message}". Narrate the WHOLE script.`
    : `VISUAL SYNC: The camera work and environment movement should pulse and react to the emotional beats of the script: "${params.message}".`;

  const initialPayload: any = {
    model: modelToUse,
    prompt: `${baseCinematicInstruction}\n${lipSyncInstruction}`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
    },
  };

  const referenceImages: any[] = [];
  if (params.userPhoto) {
    referenceImages.push({
      image: { imageBytes: params.userPhoto.base64, mimeType: params.userPhoto.file.type || 'image/jpeg' },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  }
  if (params.scenePhoto) {
    referenceImages.push({
      image: { imageBytes: params.scenePhoto.base64, mimeType: params.scenePhoto.file.type || 'image/jpeg' },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  }
  if (referenceImages.length > 0) {
    initialPayload.config.referenceImages = referenceImages;
  }

  try {
    let operation = await ai.models.generateVideos(initialPayload);
    operation = await pollOperation(ai, operation);

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) {
      throw new Error("Video Production Failed: The model failed to generate a visual asset. This may be due to safety filters or transient capacity issues.");
    }
    
    let currentProducedDuration = segmentLength;
    
    // Extension Loop: Sync visuals to audio length
    while (currentProducedDuration < targetDuration) {
      const extensionPrompt = `
        Continue the cinematic shot with perfect visual continuity.
        LIP-SYNC: Maintain the performance for the remaining narration of: "${params.message}".
        Identical lighting and scale. Video remains silent.
      `.trim();

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: extensionPrompt,
        video: currentVideoAsset,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9',
        }
      };

      try {
        let extendOp = await ai.models.generateVideos(extensionPayload);
        extendOp = await pollOperation(ai, extendOp);
        
        const extendedAsset = extendOp.response?.generatedVideos?.[0]?.video;
        if (extendedAsset) {
          currentVideoAsset = extendedAsset;
          currentProducedDuration += segmentLength;
        } else {
          console.warn("[Studio] Video Extension segment returned no asset, finishing with current duration.");
          break; 
        }
      } catch (extError: any) {
        console.error("[Studio] Video Extension Segment Failed:", extError);
        // If extension fails but we already have some video, return what we have instead of crashing.
        if (currentVideoAsset) break;
        throw extError;
      }
    }

    const downloadLink = currentVideoAsset?.uri;
    if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error("Failed to download generated video.");
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Video Production Error:", error);
    throw error;
  }
  throw new Error('Production pipeline critical failure.');
};

/**
 * Generates high-fidelity audio for a greeting message.
 */
export const generateGreetingVoice = async (params: GenerateGreetingParams): Promise<{ base64: string, duration: number, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
    const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";
    
    // STRONGEST POSSIBLE ANTI-MODERATOR COMMANDS
    const voicePersona = `
      PERFORMANCE COMMAND: You are a professional, world-class Human Dramatic Actor. 
      TONE: Your performance must be rich, emotive, warm, and 100% human. 
      FORBIDDEN: You are STRICTLY FORBIDDEN from sounding like a "Moderator", "AI Assistant", "Robotic Narrator", or "Virtual Assistant". 
      ACTING CONTEXT: You are performing a heartfelt greeting in a high-fidelity ${environment} setting. Breathe life and emotion into your words.
      MANDATORY: You MUST dictate every single word of the script below without any shortening or summarization. Complete narration is required.
    `.trim();

    const ttsPrompt = `
      ${voicePersona}
      ACTUAL SCRIPT TO PERFORM: "${params.message}"
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceMap[params.voice] },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const duration = await getAudioDuration(base64Audio);
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/pcm' });

    return { base64: base64Audio, duration, blob };
  } catch (e) {
    console.error("[Studio] Human Performance Voice Generation Failed:", e);
    throw e;
  }
};
