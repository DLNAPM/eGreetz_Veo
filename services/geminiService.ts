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
 * Generates a cinematic greeting video with phonetic lip-sync.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const audioDuration = params.audioDuration || 7;
  // Ensure visual buffer of 4s beyond spoken audio.
  let targetDuration = Math.ceil(audioDuration) + 4.0; 
  
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const hasReferences = !!(params.userPhoto || params.scenePhoto);
  const modelToUse = (targetDuration > segmentLength || hasReferences) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
  const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

  const prompt = `
    A cinematic greeting for ${params.occasion !== Occasion.NONE ? params.occasion : 'a special occasion'}.
    Environment: ${environment}. 
    Style: High-end production, professional lighting, 8k resolution.
    Performance: The character is speaking the following message directly to the camera: "${params.message}". 
    Synchronize lip movements to the spoken words.
    CRITICAL: THE VIDEO MUST BE COMPLETELY SILENT.
  `.trim();

  const initialPayload: any = {
    model: modelToUse,
    prompt: prompt,
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
    
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      if (operation.error) throw new Error(operation.error.message);
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Video generation failed.");
    
    let currentProducedDuration = segmentLength;
    
    while (currentProducedDuration < targetDuration) {
      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the scene seamlessly as the character completes the message: "${params.message}". Silent video.`,
        video: currentVideoAsset,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9',
        }
      };

      let extendOp = await ai.models.generateVideos(extensionPayload);
      while (!extendOp.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        extendOp = await ai.operations.getVideosOperation({ operation: extendOp });
        if (extendOp.error) break; 
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
    console.error("[Gemini] Production Failure:", error);
    throw error;
  }
  throw new Error('Video production pipeline failed.');
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
    const ttsPrompt = `
      You are a professional human narrator with a warm, natural, and expressive voice.
      Please narrate the following message with heartfelt emotion, speaking every word clearly:
      "${params.message}"
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
    console.error("[Gemini] Voice Generation failed:", e);
    throw e;
  }
};
