# eGreetz - Cinematic AI Greetings

eGreetz is a high-end web application that allows users to create stunning, cinematic video greetings using Google's Gemini and Veo AI models. Personalized with your own photo and voice selection, eGreetz turns simple messages into movie-quality moments.

## Features

- **Cinematic Video Generation**: Powered by the Veo model for high-quality celebratory visuals.
- **AI Voice Personalization**: Choose between Male (Tenor/Bass) or Female voices via Gemini TTS.
- **Personalized Visuals**: Upload a photo to serve as a character reference for the AI.
- **Voice-to-Text**: Dictate your greeting message using built-in microphone support.
- **Cloud Sync**: Secure Google Authentication and Firestore database for saving and managing your greetings.
- **Multi-channel Sharing**: Share via Email, SMS, direct link, or internal user accounts.

## Tech Stack

- **Frontend**: React (v19), Tailwind CSS, Lucide Icons.
- **AI**: Google Gemini API (@google/genai).
- **Backend/Auth**: Firebase (Authentication & Cloud Firestore).
- **Deployment**: Optimized for Render.com.

## Setup

1. **Clone the repository.**
2. **Environment Variables**: Create a `.env` file based on `.env.example`.
   - `API_KEY`: Your Google AI Studio API Key.
   - `VITE_FIREBASE_CONFIG`: Your Firebase configuration JSON string.
3. **Install dependencies**: `npm install`.
4. **Run locally**: `npm run dev`.

## Deployment

Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Render and Firebase.
