import {Video} from '@google/genai';

export enum AppState {
  IDLE,
  AUTH,
  LOADING,
  SUCCESS,
  ERROR,
  GALLERY
}

export enum Occasion {
  NONE = 'None',
  BIRTHDAY = 'Happy Birthday',
  CHRISTMAS = 'Merry Christmas',
  ANNIVERSARY = 'Happy Anniversary',
  NEW_YEARS = 'Happy New Years',
  PROMOTION = 'Congratulations on your Promotion',
  GRADUATION = 'Congratulations on your Graduation',
  CONGRATULATIONS = 'Congratulations',
  VALENTINES = 'Valentine\'s Day (Love & Romance)',
  EASTER = 'Happy Easter (Resurrection & Spring)',
  MOTHERS_DAY = 'Happy Mother\'s Day',
  FATHERS_DAY = 'Happy Father\'s Day',
  SYMPATHY = 'Deepest Sympathy (In Loving Memory)',
  THANK_YOU = 'Thank You',
  HELLO = 'Hello'
}

export enum GreetingTheme {
  NONE = 'None',
  BALLOONS = 'Balloons dropping',
  CHAMPAGNE = 'Champagne popping',
  FIREWORKS = 'Fireworks',
  NOISE_MAKERS = 'Noise makers',
  HEARTS = 'Floating Hearts & Roses',
  FLOWERS = 'Blooming Spring Garden',
  CANDLES = 'Serene Candlelight',
  CONFETTI = 'Colorful Confetti',
  CLAPPING = 'Clapping and whistling',
  BOY_BABY_SHOWER = 'Boy Baby Shower',
  GIRL_BABY_SHOWER = 'Girl Baby Shower'
}

export enum VoiceGender {
  MALE_TENOR = 'Male (Tenor)',
  MALE_BASS = 'Male (Bass)',
  FEMALE = 'Female'
}

export enum VeoModel {
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO = 'veo-3.1-generate-preview',
}

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export enum Resolution {
  P720 = '720p',
  P1080 = '1080p',
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'Text to Video',
  FRAMES_TO_VIDEO = 'Frames to Video',
  REFERENCES_TO_VIDEO = 'References to Video',
  EXTEND_VIDEO = 'Extend Video',
}

export interface ImageFile {
  file: File;
  base64: string;
}

export interface AudioFile {
  file: File;
  base64: string;
}

export interface VideoFile {
  file: File;
  base64: string;
}

export interface GreetingRecord {
  id: string;
  userId: string;
  occasion: Occasion;
  message: string;
  theme: GreetingTheme;
  scenicDescription?: string;
  videoUrl: string;
  voice?: VoiceGender;
  voiceUrl?: string; // Persistent synthesized voice
  backgroundMusicUrl?: string;
  createdAt: number;
}

export interface GenerateGreetingParams {
  occasion: Occasion;
  message: string;
  theme: GreetingTheme;
  scenicDescription?: string;
  voice: VoiceGender;
  userPhoto: ImageFile | null;
  scenePhoto: ImageFile | null;
  backgroundMusic: AudioFile | null;
  model: VeoModel;
  aspectRatio: AspectRatio;
  extended: boolean;
}

export interface GenerateVideoParams {
  prompt: string;
  model: VeoModel;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  mode: GenerationMode;
  startFrame: ImageFile | null;
  endFrame: ImageFile | null;
  referenceImages: ImageFile[];
  styleImage: ImageFile | null;
  inputVideo: VideoFile | null;
  inputVideoObject: Video | null;
  isLooping: boolean;
}