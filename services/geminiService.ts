
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

/**
 * Generates a cinematic greeting video using Gemini Veo models.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams
): Promise<{ objectUrl: string; blob: Blob }> => {
  // Always create a new instance to ensure we have the latest API key from state/env
  // NOTE: Rely on the environment variable injection.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. If you are in AI Studio, please select a paid API key. If deployed, ensure the API_KEY environment variable is set.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const modelToUse = params.userPhoto ? 'veo-3.1-generate-preview' : params.model;

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    Visual Theme: ${params.theme}. 
    Atmosphere: Joyful, celebratory, professional cinematic lighting, 8k resolution feel.
    The video should be visually stunning.
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
    let operation = await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      // CRITICAL: Append an API key when fetching from the download link.
      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!response.ok) throw new Error('Failed to download the generated video file.');
      
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }

  throw new Error('Video generation failed to return a valid result.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 */
export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<string | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this greeting message warmly: ${text}` }] }],
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
    return base64Audio ? `data:audio/pcm;base64,${base64Audio}` : null;
  } catch (e) {
    console.error("Voice Generation failed:", e);
    return null;
  }
};
