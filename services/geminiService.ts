
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel } from '../types';

// Fix: Always create a new GoogleGenAI instance inside the function right before the API call to ensure the latest API key from the environment is used.
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

  // GUIDELINE: To generate a video with a starting image, use the 'image' property in the root of the request object.
  if (params.userPhoto) {
    payload.image = {
      imageBytes: params.userPhoto.base64,
      mimeType: params.userPhoto.file.type || 'image/jpeg',
    };
  }

  try {
    let operation = await ai.models.generateVideos(payload);

    // Poll until completion with reassuring wait times
    while (!operation.done) {
      // GUIDELINE: Video generation can take a few minutes. Poll every 10 seconds.
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      // GUIDELINE: Use process.env.API_KEY directly when fetching video bytes from the operation download link.
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

/**
 * Generates a warm greeting voice using Gemini TTS.
 * Note: The returned audio is raw PCM data (24kHz, 1 channel, 16-bit).
 * It must be decoded manually using AudioContext before playback as per Gemini guidelines.
 */
export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<string | null> => {
  // Fix: Initializing GoogleGenAI with the API key from environment directly before use.
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
        // GUIDELINE: Must be an array with a single `Modality.AUDIO` element.
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceMap[voice] },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    // GUIDELINE: The audio bytes returned by the API is raw PCM data. 
    // It is not a standard file format like .wav or .mp3 and contains no header.
    return base64Audio || null;
  } catch (e) {
    console.error("Voice Generation failed:", e);
    return null;
  }
};
