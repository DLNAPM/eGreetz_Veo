
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

export const generateGreetingVideo = async (
  params: GenerateGreetingParams
): Promise<{ objectUrl: string; blob: Blob }> => {
  // Mandated pattern: Create instance right before the call using process.env.API_KEY directly.
  // This ensures we pick up keys injected after window.aistudio.openSelectKey() is called.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use the advanced Veo model if a reference photo is provided, as it is required for asset-based generation.
  // Otherwise, use the user-selected or default model.
  const modelToUse = params.userPhoto ? 'veo-3.1-generate-preview' : params.model;

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    Visual Theme: ${params.theme}. 
    Atmosphere: Joyful, celebratory, professional cinematic lighting, 8k resolution feel.
    The video should feel personal, warm, and professional. 
    Context of the message: ${params.message.substring(0, 300)}
  `.trim();

  // Reference images (ASSET type) require 16:9 aspect ratio and 720p resolution for the current API version.
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

    // Poll until completion with reassuring intervals
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation?.response?.generatedVideos?.[0]?.video?.uri) {
      const videoUri = operation.response.generatedVideos[0].video.uri;
      // Fetch the binary data using the authenticated download link + key
      const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      if (!res.ok) throw new Error('Failed to download the generated video file.');
      
      const blob = await res.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    // Rethrow to be caught by App.tsx handleGenerate which manages the UI and picker flow.
    throw error;
  }

  throw new Error('Video generation failed: No video URI returned from operation.');
};

export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<string | null> => {
  // Mandated pattern: Create instance right before the call.
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
    // Note: TTS returns raw PCM data.
    return base64Audio ? `data:audio/pcm;base64,${base64Audio}` : null;
  } catch (e) {
    console.error("Voice Generation failed:", e);
    return null;
  }
};
