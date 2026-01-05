
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
    // 2 bytes per sample (16-bit), 24000 samples per second
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    console.warn("[Studio] Could not determine audio duration accurately, defaulting to 10s", e);
    return 10;
  }
}

/**
 * Generates a cinematic greeting video using Gemini Veo models.
 * Dynamically extends the production to match or exceed the audio script duration.
 * Ensures "Director's Cut" produces a video of at least 15 seconds.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Calculate Target Duration
  // Video must cover the full audio script + a buffer for smooth outro
  const audioDuration = params.audioDuration || 7;
  let targetDuration = Math.ceil(audioDuration) + 2; 
  
  // "Director's Cut" logic: Ensure a minimum of 15 seconds.
  // Since segments are ~7s, 2 segments is 14s, so we target 15s+ which will naturally
  // result in 3 segments (approx 21s) for a robust production.
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const segmentLength = 7; 
  const needsExtension = targetDuration > segmentLength;

  /**
   * For any production requiring extensions, we use 'veo-3.1-generate-preview'
   * as it is the primary model for consistent stylistic chaining.
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
    Visual narrative: ${params.message.substring(0, 1000)}
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
    console.log(`[Studio] Starting Production. Script Length: ${audioDuration.toFixed(1)}s. Target Video: ${targetDuration}s.`);
    
    // 1. Initial Segment (0 - 7s)
    let operation = await ai.models.generateVideos(initialPayload);
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Initial production segment failed.");
    
    let currentProducedDuration = segmentLength;
    
    // 2. Iterative Extension Loop
    // Continues production until the video length satisfies the target duration.
    while (currentProducedDuration < targetDuration) {
      console.log(`[Studio] Extending Production. Progress: ${currentProducedDuration}s / ${targetDuration}s.`);
      
      /**
       * Delay to ensure the previous video segment is fully indexed by the Gemini backend.
       */
      await new Promise((resolve) => setTimeout(resolve, 20000));

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the beautiful cinematic celebration for ${params.occasion}. The scene flows seamlessly into more celebratory visuals, maintaining perfect style, character, and lighting consistency.`,
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
        console.warn("[Studio] Extension failed to return asset. Finalizing.");
        break; 
      }
    }

    const downloadLink = currentVideoAsset?.uri;
    if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error('Failed to retrieve finalized production file.');
      
      const blob = await response.blob();
      console.log(`[Studio] Success. Produced approx ${currentProducedDuration}s of cinematic visuals.`);
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Video Pipeline Error:", error);
    throw error;
  }

  throw new Error('Production pipeline failed.');
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
