
# eGreetz Deployment Guide

## 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named "eGreetz".
3. **Authentication**: Enable **Google** as a sign-in provider.
4. **Cloud Firestore**: Create database in **Production** mode.
   - Go to the **Rules** tab and paste the content of `firestore.rules`.
5. **Cloud Storage**: Get started in **Production** mode.
   - Go to the **Rules** tab and paste the content of `storage.rules`.
6. **Project Settings**: 
   - General > Your apps > Add app > Web.
   - Copy the `firebaseConfig` object values. You will need these for Render environment variables.

## 2. Render.com Deployment
1. Connect your GitHub repository to Render.
2. Create a **New Static Site**.
3. **Build Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Environment Variables**:
   Add the following keys. You can find the Firebase values in your Project Settings > General > Your apps > SDK setup and configuration.

   | Key | Value Description |
   | :--- | :--- |
   | `VITE_API_KEY` | Your Google Gemini API Key (Must have billing enabled for Veo models) |
   | `VITE_FIREBASE_API_KEY` | Firebase `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | Firebase `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Firebase `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | Firebase `appId` |
   | `VITE_FIREBASE_MEASUREMENT_ID` | Firebase `measurementId` (Optional) |

   *Note: Alternatively, you can paste the entire JSON string into `VITE_FIREBASE_CONFIG` if you prefer, but individual keys are less error-prone.*

## 3. Post-Deployment Configuration
1. **Authorized Domains**:
   - In Firebase Console > Authentication > Settings > Authorized domains.
   - Add your Render URL (e.g., `egreetz.onrender.com`).
   - This is required for Google Sign-In to work.

2. **CORS (Optional)**:
   - If you encounter cross-origin issues with the images/videos, you may need to configure CORS for your Cloud Storage bucket using `gsutil` or the Google Cloud Console. However, the `storage.rules` provided usually suffice for standard web access.
