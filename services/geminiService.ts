import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender } from '../types';

export const generateGreetingVideo = async (
  params: GenerateGreetingParams
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const cinematicPrompt = `
    A cinematic, high-quality holiday greeting video for ${params.occasion}.
    Visual Theme: ${params.theme}. 
    Atmosphere: Joyful, celebratory, 8k resolution, professional lighting.
    The video should feel personal and warm. 
    Context: ${params.message.substring(0, 200)}...
  `.trim();

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: params.aspectRatio,
  };

  const payload: any = {
    model: params.model,
    prompt: cinematicPrompt,
    config: config,
  };

  if (params.userPhoto) {
    payload.config.referenceImages = [{
      image: {
        imageBytes: params.userPhoto.base64,
        mimeType: params.userPhoto.file.type,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }];
  }

  let operation = await ai.models.generateVideos(payload);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation?.response?.generatedVideos?.[0]?.video?.uri) {
    const videoUri = operation.response.generatedVideos[0].video.uri;
    const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch generated video');
    const blob = await res.blob();
    return { objectUrl: URL.createObjectURL(blob), blob };
  }

  throw new Error('Video generation failed');
};

export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<string | null> => {
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
    return base64Audio ? `data:audio/pcm;base64,${base64Audio}` : null;
  } catch (e) {
    console.error("TTS failed", e);
    return null;
  }
};