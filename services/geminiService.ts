
import {
  GoogleGenAI,
  Modality,
  VideoGenerationReferenceType,
} from '@google/genai';
import { GenerateGreetingParams, VoiceGender, VeoModel, Occasion } from '../types';

/**
 * Helper to decode base64 audio and get its duration in seconds.
 * Gemini TTS output is raw PCM at 24kHz 16-bit mono.
 */
async function getAudioDuration(base64Data: string): Promise<number> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // 2 bytes per sample (16-bit), 24000 samples per second
    const duration = (bytes.length / 2) / 24000; 
    return duration;
  } catch (e) {
    console.warn("[Studio] Could not determine audio duration accurately, defaulting to 10s", e);
    return 10;
  }
}

/**
 * Generates a cinematic greeting video using Gemini Veo models.
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

  const occasionHeader = params.occasion !== Occasion.NONE 
    ? `Cinematic holiday greeting for ${params.occasion}` 
    : `Awesome Cinematic Masterpiece with conceptual narrative`;

  // Focus purely on script descriptors if Occasion is None
  const scriptPriority = params.occasion === Occasion.NONE 
    ? `IMPORTANT: This video has no specific occasion. Use the ENTIRE script text below to create the Awesome Cinematic Visuals, interpreting the imagery, mood, and story directly from these words: "${params.message}"`
    : `Visual narrative based on this script: "${params.message.substring(0, 500)}..."`;

  const cinematicPrompt = `
    ${occasionHeader}.
    ${visualContext}. 
    Style: High-end professional cinematic lighting, 8k resolution textures, epic atmosphere, detailed textures.
    ${scriptPriority}
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
    if (!currentVideoAsset) throw new Error("Initial production segment failed.");
    
    let currentProducedDuration = segmentLength;
    
    while (currentProducedDuration < targetDuration) {
      // 45s wait to allow backend indexing
      await new Promise((resolve) => setTimeout(resolve, 45000));

      const extensionPayload = {
        model: 'veo-3.1-generate-preview',
        prompt: `Continue the cinematic visual narrative established by this script: ${params.message.substring(0, 200)}...`,
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
      if (!response.ok) throw new Error('Failed to retrieve finalized production file.');
      const blob = await response.blob();
      return { objectUrl: URL.createObjectURL(blob), blob };
    }
  } catch (error: any) {
    console.error("[Studio] Video Production Failure:", error);
    throw error;
  }
  throw new Error('Video production pipeline failed.');
};

/**
 * Generates audio for a greeting message using Gemini TTS.
 */
export const generateGreetingVoice = async (text: string, voice: VoiceGender): Promise<{ base64: string, duration: number, blob: Blob } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const voiceMap: Record<VoiceGender, string> = {
    [VoiceGender.MALE_TENOR]: 'Kore',
    [VoiceGender.MALE_BASS]: 'Puck',
    [VoiceGender.FEMALE]: 'Charon'
  };

  try {
    // STRICT PROMPT: Instruct the model to read the script exactly once with NO repetitions.
    const ttsPrompt = `Read the following script exactly once. DO NOT repeat any phrases. Read from start to finish without looping or stuttering. READ THIS TEXT ONCE: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: ttsPrompt }] }],
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
    if (!base64Audio) return null;

    const duration = await getAudioDuration(base64Audio);
    
    // Create Blob for persistent storage
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
