// Firebase configuration
// Replace these values with your Firebase project settings from:
// https://console.firebase.google.com -> Project Settings -> General -> Your apps

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Instructions:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project or select existing one
// 3. Add a Web app
// 4. Copy the config values and paste above
// 5. Enable Authentication (Email/Password, Google)
// 6. Enable Firestore Database
// 7. Set security rules (see SYNC_IMPLEMENTATION.md)
