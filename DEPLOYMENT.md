
# eGreetz Deployment Guide

## 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named "eGreetz".
3. Enable **Authentication** and add **Google** as a provider.
4. Enable **Cloud Firestore** in "Production" mode.
5. Create a Web App. You will need the config values for Render.

## 2. Render.com Deployment
1. Connect your GitHub repository to Render.
2. Choose **Static Site**.
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   
   ### Essential Keys:
   - `VITE_API_KEY`: Your Google Gemini API Key (ensure billing is enabled for Veo). This is mapped to the standard `process.env.API_KEY` expected by the SDK.
   
   ### Firebase Configuration (Individual Keys):
   - `VITE_FIREBASE_API_KEY`: The `apiKey` from your Firebase config.
   - `VITE_FIREBASE_AUTH_DOMAIN`: The `authDomain`.
   - `VITE_FIREBASE_PROJECT_ID`: The `projectId`.
   - `VITE_FIREBASE_STORAGE_BUCKET`: The `storageBucket`.
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: The `messagingSenderId`.
   - `VITE_FIREBASE_APP_ID`: The `appId`.
   - `VITE_FIREBASE_MEASUREMENT_ID`: The `measurementId`.

   *Alternatively, you can set a single `VITE_FIREBASE_CONFIG` variable containing the full JSON object.*

## 3. Important Tips
- Ensure your Google Cloud Project (linked to Gemini API) has **billing enabled** for Veo models.
- Add your Render deployment URL (e.g., `https://egreetz.onrender.com`) to the **Authorized Domains** in Firebase Auth settings.
