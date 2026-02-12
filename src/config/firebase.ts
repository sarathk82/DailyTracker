// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAcKWMQHjUtAq9Bu-W57JI0E6vipRH3WkY",
  authDomain: "smpl-journal.firebaseapp.com",
  projectId: "smpl-journal",
  storageBucket: "smpl-journal.firebasestorage.app",
  messagingSenderId: "290585147080",
  appId: "1:290585147080:web:215f6530a93fc6ec0f57fd",
  measurementId: "G-C2ENYKTYXW"
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

// Analytics only on web
export const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;
