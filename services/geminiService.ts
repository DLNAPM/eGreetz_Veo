
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel, Occasion } from '../types';

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
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    return 10;
  }
}

/**
 * Generates a cinematic greeting video with instructions for lip-sync and facial animation.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams & { audioDuration?: number }
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const audioDuration = params.audioDuration || 7;
  let targetDuration = Math.ceil(audioDuration) + 2; 
  
  if (params.extended) {
    targetDuration = Math.max(targetDuration, 15);
  }

  const needsExtension = targetDuration > segmentLength;
  const modelToUse = (needsExtension || params.userPhoto) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const visualContext = params.scenicDescription && params.scenicDescription.trim().length > 0 
    ? `Visual Environment: ${params.scenicDescription}` 
    : (params.occasion !== Occasion.NONE ? `Visual Theme: ${params.theme}` : '');

  const lipSyncInstruction = params.userPhoto 
    ? "The character from the reference image is looking directly at the camera. Their mouth and facial muscles must move in perfect synchronization with the spoken dialogue. Animate the lips, jaw, and eyes to express the emotion of the script."
    : "The visual narrative must feature central elements that express the script's emotion through movement and cinematic framing.";

  const cinematicPrompt = `
    A professional cinematic production.
    ${visualContext}. 
    ${lipSyncInstruction}
    Style: 8k resolution, professional film lighting, high-quality facial textures.
    Narrative Script Context: "${params.message}"
    IMPORTANT: The video file itself should be silent or contain only faint atmospheric ambient sounds. Do not generate overlapping synthetic voices.
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
    let operation = await ai.models.generateVideos(initialPayload);
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Initial production failed.");
    
    let currentProducedDuration = segmentLength;
    
    while (currentProducedDuration < targetDuration) {
      await new Promise((resolve) => setTimeout(resolve, 45000));

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the cinematic shot. The character continues speaking. Mouth movements must be highly detailed and match the script flow: "${params.message.substring(0, 100)}...". Maintain character consistency.`,
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
    console.error("[Studio] Video Production Failure:", error);
    throw error;
  }
  throw new Error('Production pipeline failed.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 * Stylizes the voice tone based on the environment and character context.
 */
export const generateGreetingVoice = async (params: GenerateGreetingParams): Promise<{ base64: string, duration: number, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    // Determine tone based on environment/occasion
    const environment = params.scenicDescription || params.theme || "Cinematic Studio";
    const toneContext = `In a style that matches a ${environment} environment and is appropriate for a ${params.occasion} occasion.`;

    const ttsPrompt = `
      ${toneContext}
      Read the following script exactly as written. 
      Speak clearly, naturally, and with high-quality cinematic presence. 
      DO NOT repeat any words or phrases. Read once from beginning to end.
      Script: "${params.message}"
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
