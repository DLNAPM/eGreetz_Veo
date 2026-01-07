
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
 * Generates a cinematic greeting video with phonetic lip-sync and enforced silence.
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
  const modelToUse = (needsExtension || params.userPhoto || params.scenePhoto) 
    ? 'veo-3.1-generate-preview' 
    : 'veo-3.1-fast-generate-preview';

  const environment = params.scenicDescription || params.theme || "Cinematic Studio";
  const visualContext = `Visual Environment: ${environment}`;

  // DIRECTIVE: Explicitly command the model to keep the video SILENT and match lip-sync.
  const lipSyncInstruction = params.userPhoto 
    ? `PHONETIC LIP-SYNC FOCUS: The character in the reference image is speaking directly to the lens. Their mouth, jaw, and facial expressions MUST move in perfect synchronization with the syllables of the script: "${params.message}". The character looks natural, with appropriate eye contact and emotional facial changes matching the tone of the message.`
    : `The visuals must feature cinematic elements that dynamically react to the flow and emotion of the script: "${params.message}".`;

  const cinematicPrompt = `
    High-end ${params.occasion !== Occasion.NONE ? params.occasion : 'Cinematic Masterpiece'} production.
    ${visualContext}. 
    ${lipSyncInstruction}
    Style: Professional 8k cinematography, realistic lighting, detailed textures.
    IMPORTANT: The video file MUST BE SILENT. Do not generate any background voices, speech, or synthetic chatter. Only generate the visual narrative.
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

  const referenceImages: any[] = [];
  if (params.userPhoto) {
    referenceImages.push({
      image: {
        imageBytes: params.userPhoto.base64,
        mimeType: params.userPhoto.file.type || 'image/jpeg',
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  }
  if (params.scenePhoto) {
    referenceImages.push({
      image: {
        imageBytes: params.scenePhoto.base64,
        mimeType: params.scenePhoto.file.type || 'image/jpeg',
      },
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
    }

    let currentVideoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!currentVideoAsset) throw new Error("Initial production failed.");
    
    let currentProducedDuration = segmentLength;
    
    while (currentProducedDuration < targetDuration) {
      await new Promise((resolve) => setTimeout(resolve, 45000));

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the cinematic shot. The character continues speaking with perfect lip-sync. Maintain lighting and facial consistency for the text: "${params.message.substring(0, 100)}...". The video must remain silent.`,
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
 * Stylizes the voice to match the persona and environment.
 */
export const generateGreetingVoice = async (params: GenerateGreetingParams): Promise<{ base64: string, duration: number, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    const environment = params.scenicDescription || params.theme || "Cinematic Hall";
    const voicePersona = `You are a character speaking from a ${environment} environment. Your voice should have the appropriate warmth, echo, and presence for this setting.`;

    const ttsPrompt = `
      ${voicePersona}
      INSTRUCTION: Read the following script exactly as written. NO repetitions. Speak naturally and clearly with cinematic presence.
      SCRIPT: "${params.message}"
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
