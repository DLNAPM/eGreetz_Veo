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
  // Fresh instance to ensure current API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const audioDuration = params.audioDuration || 7;
  // Buffer of 3.5s to ensure visual continuity beyond audio end
  let targetDuration = Math.ceil(audioDuration) + 3.5; 
  
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const hasReferences = !!(params.userPhoto || params.scenePhoto);
  const needsExtension = targetDuration > segmentLength;
  
  // Model selection based on requirements
  const modelToUse = (needsExtension || hasReferences) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
  const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

  // Production instructions
  const baseCinematicInstruction = `
    Cinematic production for ${params.occasion !== Occasion.NONE ? params.occasion : 'Special Occasion'}.
    Environment: ${environment}. 
    Atmosphere: High-fidelity cinematography, detailed lighting.
    CRITICAL: THE VIDEO FILE MUST BE COMPLETELY SILENT. NO AUDIO TRACKS.
  `.trim();

  const lipSyncInstruction = params.userPhoto 
    ? `CHARACTER PERFORMANCE: The person from the reference image is speaking directly to the camera. LIP-SYNC: Sync their mouth movement perfectly to this script: "${params.message}". Read the FULL script.`
    : `VISUAL RESPONSE: The cinematic environment reacts to the spoken script: "${params.message}".`;

  const initialPayload: any = {
    model: modelToUse,
    prompt: `${baseCinematicInstruction}\n${lipSyncInstruction}`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9', // Veo 3.1 stable at 16:9
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
    
    // Polling Loop
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      
      if (operation.error) {
        throw new Error(`Veo Production Failed: ${operation.error.message}`);
      }
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) {
      // Check for safety filter rejection
      const isFiltered = operation.response?.generatedVideos === undefined || operation.response?.generatedVideos.length === 0;
      throw new Error(isFiltered ? "Content blocked by safety filters. Try a different script." : "Initial production failed to return video asset.");
    }
    
    let currentProducedDuration = segmentLength;
    
    // Extension Loop: Ensure visual continuity matches audio length
    while (currentProducedDuration < targetDuration) {
      const extensionPrompt = `
        Continue the cinematic shot seamlessly. The character is still in frame.
        LIP-SYNC: Complete the narration of the script: "${params.message}".
        Silent video file. Match visual style exactly.
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

      let extendOp = await ai.models.generateVideos(extensionPayload);
      while (!extendOp.done) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        extendOp = await ai.operations.getVideosOperation({ operation: extendOp });
        if (extendOp.error) throw new Error(`Video Extension Failed: ${extendOp.error.message}`);
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
      if (!response.ok) throw new Error("Failed to download video from production server.");
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Production Pipeline Error:", error);
    throw error;
  }
  throw new Error('Critical failure in production pipeline.');
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
    
    const voicePersona = `
      NARRATOR COMMAND: You are a professional, world-class Human Cinematic Actor. 
      PERFORMANCE: Your voice is expressive, warm, and deeply human. 
      STRICT PROHIBITION: DO NOT use any "Moderator", "Assistant", "Virtual Assistant", or "Robotic" tones. 
      CONTEXT: You are recording in a high-fidelity studio for a cinematic ${environment} project.
      MANDATORY: Dictate EVERY WORD of the provided script clearly. Do NOT shorten. Do NOT skip. 
    `.trim();

    const ttsPrompt = `
      ${voicePersona}
      SCRIPT: "${params.message}"
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
    console.error("[Studio] TTS Generation Error:", e);
    throw e;
  }
};