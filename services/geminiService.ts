
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

export const generateGreetingVideo = async (
  params: GenerateGreetingParams
): Promise<{ objectUrl: string; blob: Blob }> => {
  // Use the API key provided in the environment. 
  // GUIDELINE: Always use process.env.API_KEY directly in the constructor
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // If a photo is provided, we use the standard Veo model for reference-based generation
  const modelToUse = params.userPhoto ? 'veo-3.1-generate-preview' : params.model;

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    Visual Theme: ${params.theme}. 
    Atmosphere: Joyful, celebratory, professional cinematic lighting, 8k resolution feel.
    The video should be visually stunning.
    Context: ${params.message.substring(0, 300)}
  `.trim();

  // Veo constraints for reference images: 720p and 16:9 are recommended for preview models
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

    // Poll until completion with reassuring wait times
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      // GUIDELINE: Use process.env.API_KEY directly when fetching video bytes
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error('Failed to download the generated video file.');
      
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    throw error;
  }

  throw new Error('Video generation failed to return a valid operation response.');
};

export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<string | null> => {
  // GUIDELINE: Always initialize GoogleGenAI with the API key from environment directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    // Note: PCM audio requires manual decoding for browser playback as per guidelines.
    return base64Audio ? `data:audio/pcm;base64,${base64Audio}` : null;
  } catch (e) {
    console.error("Voice Generation failed:", e);
    return null;
  }
};
