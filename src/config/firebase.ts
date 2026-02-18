// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔐 SECURITY: Environment variables from .env file
// Expo uses EXPO_PUBLIC_ prefix for client-side environment variables
// See .env.example for setup instructions
// IMPORTANT: Regenerate all Firebase keys if old ones were exposed!
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAcKWMQHjUtAq9Bu-W57JI0E6vipRH3WkY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "smpl-journal.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "smpl-journal",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "smpl-journal.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "290585147080",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:290585147080:web:215f6530a93fc6ec0f57fd",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-C2ENYKTYXW",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://smpl-journal-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
let auth;
if (Platform.OS === 'web') {
  // Web uses default persistence
  auth = getAuth(app);
} else {
  // React Native uses AsyncStorage persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error: any) {
    // If already initialized, just get the existing instance
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
}

export { auth };
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

// Analytics only on web
export const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;
