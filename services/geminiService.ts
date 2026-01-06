
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
 * Generates a cinematic greeting video with phonetic lip-sync and character focus.
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
    ? "LIP-SYNC FOCUS: The character from the reference image is speaking the script to the camera. Their lips, jaw, and facial muscles must move phonetically to match the spoken words. Ensure realistic facial expressions and natural blinking. The mouth must form the shapes of the words being spoken."
    : "The visual narrative must feature central cinematic elements that reflect the script's emotion and narrative flow.";

  const cinematicPrompt = `
    ${params.occasion !== Occasion.NONE ? params.occasion : 'Awesome Cinematic Narrative'}.
    ${visualContext}. 
    ${lipSyncInstruction}
    Style: Professional film production, 8k textures, cinematic lighting, epic framing.
    Script Context: "${params.message}"
    IMPORTANT: The video must be silent. DO NOT generate any voices, speech, or sounds in the video file.
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
        prompt: `Continue the cinematic shot. The character continues speaking clearly and naturally. Maintain consistent lip-sync for these words: "${params.message.substring(0, 150)}...". Keep character and lighting identical.`,
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
 * Dynamically adjusts voice tone/persona based on environment context.
 */
export const generateGreetingVoice = async (params: GenerateGreetingParams): Promise<{ base64: string, duration: number, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    // Determine tone based on environment and occasion
    const environment = params.scenicDescription || params.theme || "Cinematic Stage";
    const toneDescription = params.occasion === Occasion.SYMPATHY ? "somber, soft, and respectful" 
                           : params.occasion === Occasion.BIRTHDAY ? "excited, warm, and cheerful"
                           : "professional, clear, and cinematic";

    const ttsPrompt = `
      PERSONA: You are the Moderator speaking from a ${environment} environment. 
      TONE: Adopt a ${toneDescription} voice that matches the scene perfectly. 
      INSTRUCTION: Read the script exactly as written. NO repetitions. NO loops. Speak naturally with high-quality cinematic presence.
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
