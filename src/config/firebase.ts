// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyAcKWMQHjUtAq9Bu-W57JI0E6vipRH3WkY",
  authDomain: "smpl-journal.firebaseapp.com",
  projectId: "smpl-journal",
  storageBucket: "smpl-journal.firebasestorage.app",
  messagingSenderId: "290585147080",
  appId: "1:290585147080:web:215f6530a93fc6ec0f57fd",
  measurementId: "G-C2ENYKTYXW",
  databaseURL: "https://smpl-journal-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

// Analytics only on web
export const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;
