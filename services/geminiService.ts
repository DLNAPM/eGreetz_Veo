
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

/**
 * Helper to decode base64 audio and get its duration in seconds.
 * Gemini TTS output is raw PCM at 24kHz 16-bit mono.
 */
async function getAudioDuration(base64Data: string): Promise<number> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // 2 bytes per sample, 24000 samples per second
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    console.warn("Could not determine audio duration, defaulting to 10s", e);
    return 10;
  }
}

/**
 * Generates a cinematic greeting video using Gemini Veo models.
 * Dynamically extends the production to match or exceed the audio script duration.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Calculate Target Duration: Audio length + generous 5s padding
  const audioDuration = params.audioDuration || 7;
  let targetDuration = Math.ceil(audioDuration) + 5; 
  
  // Director's Cut Mode: Ensure at least 21 seconds (3 segments) for a premium feel
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 21);
  }

  const segmentLength = 7;
  const needsExtension = targetDuration > segmentLength;

  /**
   * We must use 'veo-3.1-generate-preview' for all multi-segment operations
   * as it is the only model that guarantees compatibility with the extension endpoint.
   */
  const modelToUse = (needsExtension || params.userPhoto) 
    ? 'veo-3.1-generate-preview' 
    : params.model;

  const visualContext = params.scenicDescription && params.scenicDescription.trim().length > 0 
    ? `Visual Scene: ${params.scenicDescription}` 
    : `Visual Theme: ${params.theme}`;

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    ${visualContext}. 
    Atmosphere: Joyful, celebratory, professional cinematic lighting, 8k resolution feel.
    Context: ${params.message.substring(0, 500)}
  `.trim();

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: params.userPhoto ? '16:9' : params.aspectRatio,
  };

  const initialPayload: any = {
    model: modelToUse,
    prompt: cinematicPrompt,
    config: config,
  };

  if (params.userPhoto) {
    initialPayload.config.referenceImages = [{
      image: {
        imageBytes: params.userPhoto.base64,
        mimeType: params.userPhoto.file.type || 'image/jpeg',
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }];
  }

  try {
    console.log(`[Studio] Starting Production. Script: ${audioDuration}s. Goal: ${targetDuration}s.`);
    
    // 1. Initial Production (0-7s)
    let operation = await ai.models.generateVideos(initialPayload);
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Initial production failed to return video asset.");
    
    let currentProducedDuration = segmentLength;
    
    // 2. Iterative Extension Loop
    // We continue extending in ~7s chunks until we exceed the target duration.
    while (currentProducedDuration < targetDuration) {
      console.log(`[Studio] Extending Production. Current: ${currentProducedDuration}s. Target: ${targetDuration}s.`);
      
      /**
       * CRITICAL: We wait 15 seconds to ensure the URI from the previous operation 
       * is fully processed and available for extension by the backend.
       */
      await new Promise((resolve) => setTimeout(resolve, 15000));

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the cinematic celebration for ${params.occasion}. The visual narrative flows perfectly from the previous scene, maintaining identical lighting, style, and character consistency. More celebratory energy and cinematic detail.`,
        video: currentVideoAsset,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: config.aspectRatio,
        }
      };

      let extendOp = await ai.models.generateVideos(extensionPayload);
      while (!extendOp.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        extendOp = await ai.operations.getVideosOperation({ operation: extendOp });
      }
      
      const extendedAsset = extendOp.response?.generatedVideos?.[0]?.video;
      if (extendedAsset) {
        currentVideoAsset = extendedAsset;
        currentProducedDuration += segmentLength;
      } else {
        console.warn("[Studio] Extension failed to return new asset. Finalizing with current length.");
        break; 
      }
    }

    const downloadLink = currentVideoAsset?.uri;
    if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error('Failed to retrieve final production file.');
      
      const blob = await response.blob();
      console.log("[Studio] Production Wrap. Finalizing file...");
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Production Error:", error);
    throw error;
  }

  throw new Error('Video production failed to yield a final asset.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 * Returns duration for video synchronization.
 */
export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<{ base64: string, duration: number } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    // Note: Removed "Say warmly:" to prevent model from summarizing long text inputs.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceMap[voice] },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const duration = await getAudioDuration(base64Audio);
    return { base64: base64Audio, duration };
  } catch (e) {
    console.error("Voice Generation failed:", e);
    return null;
  }
};
