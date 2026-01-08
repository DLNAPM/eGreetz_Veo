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
  // Ensure video length matches audio duration with a slight buffer
  let targetDuration = Math.ceil(audioDuration) + 1.5; 
  
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const hasReferences = !!(params.userPhoto || params.scenePhoto);
  const needsExtension = targetDuration > segmentLength;
  
  // Rule: Multiple reference images requires veo-3.1-generate-preview and 16:9
  const modelToUse = (needsExtension || hasReferences) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
  const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

  const baseCinematicInstruction = `
    High-end ${params.occasion !== Occasion.NONE ? params.occasion : 'Cinematic Masterpiece'} production.
    Environment: ${environment}. 
    Style: Professional 8k cinematography, realistic lighting, detailed textures.
    CRITICAL: THE VIDEO FILE MUST BE COMPLETELY SILENT. NO AUDIO TRACKS, VOICES, OR AMBIENCE.
  `.trim();

  const lipSyncInstruction = params.userPhoto 
    ? `CHARACTER FOCUS: The character in the reference image is speaking directly to the lens. LIP-SYNC: Their mouth and jaw movements MUST move in perfect synchronization with the spoken greeting: "${params.message}". Maintain a natural, emotive performance.`
    : `VISUAL SYNC: The environment and cinematic camera work should react dynamically to the rhythm and emotion of the spoken message: "${params.message}".`;

  const initialPayload: any = {
    model: modelToUse,
    prompt: `${baseCinematicInstruction}\n${lipSyncInstruction}`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      // Ensure 16:9 if using slow model with references as per requirements
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
    
    // Polling with safety timeout and error checking
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      
      if (operation.error) {
        const errorMsg = operation.error.message || "Unknown API error";
        throw new Error(`Production Failed: ${errorMsg} (${operation.error.code})`);
      }
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) {
      if (operation.error) {
        throw new Error(`Production Error: ${operation.error.message}`);
      }
      throw new Error("Initial production failed: No video generated. This may be due to safety filters or account limitations.");
    }
    
    let currentProducedDuration = segmentLength;
    
    // Director's Cut: Extension Loop
    while (currentProducedDuration < targetDuration) {
      const extensionPrompt = `
        Continue the cinematic shot with absolute continuity. The character remains in the frame.
        LIP-SYNC: Maintain the character's speaking performance for the ongoing greeting: "${params.message}".
        Maintain identical lighting, character appearance, and facial structure from the previous segment.
        The visual story MUST stay strictly related to the greeting message content.
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
        
        if (extendOp.error) {
          throw new Error(`Extension Failed: ${extendOp.error.message}`);
        }
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
      if (!response.ok) {
        if (response.status === 404) throw new Error("Video asset not found. Please try again.");
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Video Production Failure:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API Key or Project not found. Please re-select your paid API key.");
    }
    throw error;
  }
  throw new Error('Production pipeline failed at final assembly.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 * Strictly enforces a cinematic narrator tone.
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
      PERSONA: You are a professional Cinematic Narrator with a clear, resonant, and emotive voice.
      SETTING: You are narrating from a ${environment} environment.
      STYLE: Clear, natural, and professional narration. 
      CRITICAL: Read the ENTIRE script provided below. DO NOT skip words. DO NOT sing. DO NOT rap. Just speak naturally, clearly, and cinematically.
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
    console.error("Voice Generation failed:", e);
    return null;
  }
};