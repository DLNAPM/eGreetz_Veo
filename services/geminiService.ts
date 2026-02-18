import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VeoModel, Occasion, GreetingTheme, VoiceGender, Speaker, ImageFile } from '../types';

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
 * Generates a script based on the visual persona of an uploaded image.
 */
export const generateScriptFromImage = async (
  image: ImageFile, 
  occasion: Occasion,
  existingScript: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this image. You are the character (or entity) depicted in this image.
    Write a short, engaging, and cinematic greeting script for the occasion: "${occasion}".
    
    Instructions:
    1. Write in the FIRST PERSON ("I").
    2. Adopt the personality, tone, and vibe of the character in the image.
    3. Keep it under 2 sentences.
    4. If there is already text provided: "${existingScript}", use it as a base but rewrite it in the character's voice.
    5. Return ONLY the spoken text. No stage directions.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: image.file.type || 'image/jpeg',
              data: image.base64
            }
          },
          { text: prompt }
        ]
      }
    });
    
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Script generation failed:", e);
    return "";
  }
};

/**
 * Generates a cinematic greeting video focusing on atmosphere and occasion.
 */
export const generateGreetingVideo = async (
  params: GenerateGreetingParams
): Promise<{ objectUrl: string; blob: Blob }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const segmentLength = 7;
  const targetDuration = params.extended ? 14 : 7;

  const hasReferences = !!(params.userPhoto || params.scenePhoto);
  
  const runGeneration = async (modelOverride?: VeoModel) => {
    // Force the higher quality model if using references or specific modes
    const modelToUse = modelOverride || (hasReferences 
      ? 'veo-3.1-generate-preview' 
      : 'veo-3.1-fast-generate-preview');

    const effectiveTheme = params.theme === GreetingTheme.NONE ? "" : params.theme;
    const environment = params.scenicDescription || effectiveTheme || "Cinematic Studio";

    let prompt = "";
    
    if (params.occasion === Occasion.BEFORE_AND_AFTER) {
      prompt = `
        CINEMATIC TRANSFORMATION: A high-quality before-and-after sequence or split composition based on the provided reference images.
        CONTEXT: ${environment}.
        NARRATIVE: ${params.message}.
        VISUAL STYLE: Professional documentary or cinematic reveal style. 8k resolution.
        TECHNICAL: Silent video output.
      `.trim();
    } else {
      prompt = `
        CINEMATIC PRODUCTION: A high-quality visual atmosphere for a ${params.occasion !== Occasion.NONE ? params.occasion : 'special celebration'}.
        ENVIRONMENT: ${environment}. 
        VISUAL STYLE: Professional 8k cinematography, cinematic lighting, elegant camera movements.
        MOOD: The video should capture the essence of ${params.occasion} and the beauty of ${environment}.
        TECHNICAL: Silent video output.
      `.trim();
    }

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
        throw new Error(operation.error.message);
      }
    }

    const videoAsset = operation.response?.generatedVideos?.[0]?.video;
    if (!videoAsset) {
      throw new Error("EMPTY_RESULT");
    }

    return videoAsset;
  };

  try {
    let currentVideoAsset;
    try {
      currentVideoAsset = await runGeneration();
    } catch (e: any) {
      console.warn("[Gemini] First attempt failed, retrying with stable model...");
      currentVideoAsset = await runGeneration(VeoModel.VEO);
    }
    
    let currentProducedDuration = segmentLength;
    
    while (currentProducedDuration < targetDuration) {
      try {
        const extensionPayload = {
          model: 'veo-3.1-generate-preview',
          prompt: `Seamlessly continue the cinematic shot with matching lighting and atmosphere for ${params.occasion}.`,
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
    throw new Error(error.message === "EMPTY_RESULT" ? "Model generation error. Try simplifying your description." : error.message);
  }
  throw new Error('Video production pipeline failure.');
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
    const isCharacter = params.speaker === Speaker.CHARACTER;
    
    const ttsPrompt = isCharacter 
      ? `
        You are acting as the main character in a scene.
        Adopt a persona that fits the visual context of a "${params.occasion}" celebration.
        Speak in the first person. Be expressive, immersive, and convincing.
        Lines: "${params.message}"
      `.trim()
      : `
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
    return null;
  }
};