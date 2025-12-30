
# eGreetz Deployment Guide

## 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named "eGreetz".
3. Enable **Authentication** and add **Google** as a provider.
4. Enable **Cloud Firestore** in "Production" mode.
5. Create a Web App and copy the `firebaseConfig` object.

## 2. Render.com Deployment
1. Connect your GitHub repository to Render.
2. Choose **Static Site** (or Web Service if you have a backend).
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Environment Variables**:
   - `API_KEY`: Your Google Gemini API Key.
   - `VITE_FIREBASE_CONFIG`: The JSON config from Firebase (e.g., `{"apiKey": "...", ...}`).

## 3. Important Tips
- Ensure your Google Cloud Project (linked to Gemini API) has **billing enabled** for Veo models.
- Add your Render deployment URL (e.g., `https://egreetz.onrender.com`) to the **Authorized Domains** in Firebase Auth settings.
