
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

/**
 * Helper to decode base64 audio and get its duration in seconds.
 * Note: Gemini TTS output is raw PCM, so we calculate based on expected sample rate.
 */
async function getAudioDuration(base64Data: string): Promise<number> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // The audio bytes returned by the API is raw PCM data (no header).
    // Assuming 16-bit mono PCM at 24kHz (2 bytes per sample).
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    console.warn("Could not determine exact audio duration, defaulting to 8s", e);
    return 8;
  }
}

/**
 * Generates a cinematic greeting video using Gemini Veo models.
 * Dynamically adjusts length to be syncronized with the generated audio.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  // Always initialize with named parameter and process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelToUse = params.userPhoto ? 'veo-3.1-generate-preview' : params.model;

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    Visual Theme: ${params.theme}. 
    Atmosphere: Joyful, celebratory, professional cinematic lighting, 8k resolution feel.
    Context: ${params.message.substring(0, 300)}
  `.trim();

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: params.userPhoto ? '16:9' : params.aspectRatio,
  };

  const payload: any = {
    model: modelToUse,
    prompt: cinematicPrompt,
    config: config,
  };

  if (params.userPhoto) {
    payload.config.referenceImages = [{
      image: {
        imageBytes: params.userPhoto.base64,
        mimeType: params.userPhoto.file.type || 'image/jpeg',
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }];
  }

  try {
    // Generate initial 7s video
    let operation = await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    let finalVideo = operation.response?.generatedVideos?.[0]?.video;
    
    // Extend video if audio duration exceeds standard 7s length
    const targetDuration = (params.audioDuration || 0) + 2.5;
    const currentDuration = 7;

    if (targetDuration > currentDuration && finalVideo) {
      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `The celebration reaches its cinematic peak for ${params.occasion}, keeping the same visual style and environment.`,
        video: finalVideo,
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
      finalVideo = extendOp.response?.generatedVideos?.[0]?.video;
    }

    const downloadLink = finalVideo?.uri;
    if (downloadLink) {
      // Append API key when fetching from the download link
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error('Failed to download video.');
      
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("Gemini Video Error:", error);
    throw error;
  }

  throw new Error('Video generation failed.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 * Returns duration for video sync.
 */
export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<{ base64: string, duration: number } | null> => {
  // Always initialize with named parameter and process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say warmly: ${text}` }] }],
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
