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
  
  // Logic to handle retries and model escalation
  const runGeneration = async (modelOverride?: VeoModel) => {
    const modelToUse = modelOverride || ((targetDuration > segmentLength || hasReferences) 
      ? 'veo-3.1-generate-preview' 
      : 'veo-3.1-fast-generate-preview');

    const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
    const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

    const prompt = `
      CINEMATIC PRODUCTION: A high-quality visual greeting for ${params.occasion !== Occasion.NONE ? params.occasion : 'a special event'}.
      SCENE: ${environment}. 
      VISUAL STYLE: Cinematic lighting, professional 8k photography, realistic textures.
      PERFORMANCE: A character is center-frame, looking at the camera and clearly speaking the following message: "${params.message}". 
      LIP-SYNC: Synchronize mouth movements to the spoken words of the script.
      TECHNICAL: The output video file should be silent.
    `.trim();

    const payload: any = {
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
      payload.config.referenceImages = referenceImages;
    }

    let operation = await ai.models.generateVideos(payload);
    
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      if (operation.error) {
        console.warn(`[Gemini] Operation reported error: ${operation.error.message}`);
        throw new Error(operation.error.message);
      }
    }

    const videoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!videoAsset) {
      console.warn("[Gemini] Operation completed but returned no video asset. This might be a safety filter trigger.");
      throw new Error("EMPTY_RESULT");
    }

    return videoAsset;
  };

  try {
    let currentVideoAsset;
    try {
      // Attempt 1: Standard logic
      currentVideoAsset = await runGeneration();
    } catch (e: any) {
      console.warn("[Gemini] First production attempt failed, retrying with stable model...");
      // Attempt 2: Escalate to standard (non-fast) model for better stability
      currentVideoAsset = await runGeneration(VeoModel.VEO);
    }
    
    let currentProducedDuration = segmentLength;
    
    // Extension loop for longer scripts
    while (currentProducedDuration < targetDuration) {
      try {
        const extensionPayload = {
          model: 'veo-3.1-generate-preview',
          prompt: `Continue the cinematic scene with perfect visual continuity. The character finishes saying: "${params.message}". Keep the video silent.`,
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
      } catch (extError) {
        console.warn("[Gemini] Extension failed, returning video generated so far.");
        break;
      }
    }

    const downloadLink = currentVideoAsset?.uri;
    if (downloadLink) {
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error("Failed to download video asset.");
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Gemini] Production Pipeline Failure:", error);
    throw new Error(error.message === "EMPTY_RESULT" ? "The model was unable to generate a video for this prompt. Try simplifying your message or description." : error.message);
  }
  throw new Error('Video production pipeline reached an unexpected end.');
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
