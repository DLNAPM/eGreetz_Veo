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
 * Generates a cinematic greeting video with phonetic lip-sync and enforced silence.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const audioDuration = params.audioDuration || 7;
  // Director's Rule: Ensure video length is always significantly longer than audio to avoid cut-offs.
  // Using a 3.5s buffer to account for model performance variability.
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
    High-end ${params.occasion !== Occasion.NONE ? params.occasion : 'Cinematic Masterpiece'} production.
    Environment: ${environment}. 
    Style: Professional 8k cinematography, realistic lighting, detailed textures.
    CRITICAL: THE VIDEO FILE MUST BE COMPLETELY SILENT. NO AUDIO TRACKS.
  `.trim();

  const lipSyncInstruction = params.userPhoto 
    ? `CHARACTER FOCUS: The character in the reference image is speaking directly to the lens. LIP-SYNC: Their mouth and jaw movements MUST move in perfect synchronization with the spoken greeting: "${params.message}". Narrate the ENTIRE script.`
    : `VISUAL SYNC: The environment and cinematic camera work should react dynamically to the rhythm and emotion of the spoken message: "${params.message}".`;

  const initialPayload: any = {
    model: modelToUse,
    prompt: `${baseCinematicInstruction}\n${lipSyncInstruction}`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: (modelToUse === 'veo-3.1-generate-preview' && hasReferences) ? '16:9' : params.aspectRatio,
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
    
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      
      if (operation.error) {
        throw new Error(`Production Failed: ${operation.error.message}`);
      }
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Initial production failed.");
    
    let currentProducedDuration = segmentLength;
    
    // Director's Cut: Extension Loop to match audio duration
    while (currentProducedDuration < targetDuration) {
      const extensionPrompt = `
        Continue the cinematic shot with absolute continuity. The character remains in the frame.
        LIP-SYNC: Maintain the performance for the remaining script: "${params.message}".
        Identical lighting and character structure.
        CRITICAL: THE VIDEO MUST REMAIN SILENT.
      `.trim();

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: extensionPrompt,
        video: currentVideoAsset,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: initialPayload.config.aspectRatio,
        }
      };

      let extendOp = await ai.models.generateVideos(extensionPayload);
      while (!extendOp.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        extendOp = await ai.operations.getVideosOperation({ operation: extendOp });
        if (extendOp.error) throw new Error(`Extension Failed: ${extendOp.error.message}`);
      }
      
      const extendedAsset = extendOp.response?.generatedVideos?.[0]?.video;
      if (extendedAsset) {
        currentVideoAsset = extendedAsset;
        currentProducedDuration += segmentLength;
      } else {
        break; 
      }
    }

    const downloadLink = currentVideoAsset?.uri;
    if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Video Production Failure:", error);
    throw error;
  }
  throw new Error('Production pipeline failed.');
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
    
    // MANDATORY: Explicit instruction to speak EVERY word of the script to avoid truncation on any platform.
    const voicePersona = `
      NARRATOR PERSONA: Professional, high-end cinematic storyteller. Voice is rich, human-like, resonant, and natural.
      TONE: Prestigious and human. Strictly AVOID robotic, moderator, or "virtual assistant" styles.
      ENVIRONMENT: Resonating in a high-quality ${environment} acoustic space.
      MANDATORY INSTRUCTION: You MUST dictate the ENTIRE script provided below. Do NOT shorten it. Every single word of the provided message must be spoken clearly and cinematically.
    `.trim();

    const ttsPrompt = `
      ${voicePersona}
      SCRIPT TO DICTATE IN FULL: "${params.message}"
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        thinkingConfig: { thinkingBudget: 0 },
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
    console.error("Voice Generation failed:", e);
    return null;
  }
};
