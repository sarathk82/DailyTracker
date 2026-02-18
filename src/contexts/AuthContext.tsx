import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';
import { generateSalt, generateMasterKey, validatePassword } from '../utils/encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Secure key storage wrapper
 * Uses SecureStore on native platforms, AsyncStorage on web (less secure but available)
 */
const SecureKeyStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Web: Use AsyncStorage (less secure, but SecureStore not available)
      await AsyncStorage.setItem(key, value);
    } else {
      // Native: Use SecureStore (iOS Keychain, Android KeyStore)
      await SecureStore.setItemAsync(key, value);
    }
  },
  
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  masterKey: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Allow optional auth - return null values if not available
  if (!context) {
    return {
      user: null,
      loading: false,
      masterKey: null,
      signUp: async () => { throw new Error('Auth not available'); },
      signIn: async () => { throw new Error('Auth not available'); },
      signInWithGoogle: async () => { throw new Error('Auth not available'); },
      logout: async () => { throw new Error('Auth not available'); },
      resetPassword: async () => { throw new Error('Auth not available'); },
    };
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterKey, setMasterKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Try to load cached master key from secure storage
        const cachedKey = await SecureKeyStorage.getItem('masterKey');
        if (cachedKey) {
          setMasterKey(cachedKey);
        }
      } else {
        setMasterKey(null);
        await SecureKeyStorage.removeItem('masterKey');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Validate password strength
      const validation = validatePassword(password);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, { displayName });

      // Generate encryption salt
      const salt = generateSalt();
      const key = await generateMasterKey(password, salt);

      // Store user metadata in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email,
        displayName,
        encryptionSalt: salt,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
      });

      // Cache master key in secure storage
      await SecureKeyStorage.setItem('masterKey', key);
      setMasterKey(key);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user's encryption salt from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      const salt = userData.encryptionSalt;

      // Generate master key from password
      const key = await generateMasterKey(password, salt);

      // Cache master key in secure storage
      await SecureKeyStorage.setItem('masterKey', key);
      setMasterKey(key);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await SecureKeyStorage.removeItem('masterKey');
      setMasterKey(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to log out');
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Check if running on web or mobile
      const isWeb = typeof window !== 'undefined' && window.document;
      
      if (!isWeb) {
        // Mobile - show error for now, needs OAuth implementation
        throw new Error('Google Sign-In on mobile is not yet supported. Please use email/password for now.');
      }
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // First time Google sign-in - create user with default encryption
        const defaultPassword = firebaseUser.uid; // Use UID as password for Google users
        const salt = generateSalt();
        const key = await generateMasterKey(defaultPassword, salt);

        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          encryptionSalt: salt,
          provider: 'google',
          createdAt: new Date().toISOString(),
          lastSync: new Date().toISOString(),
        });

        await SecureKeyStorage.setItem('masterKey', key);
        setMasterKey(key);
      } else {
        // Existing user - retrieve encryption key
        const userData = userDoc.data();
        const salt = userData.encryptionSalt;
        const defaultPassword = firebaseUser.uid;
        const key = await generateMasterKey(defaultPassword, salt);

        await SecureKeyStorage.setItem('masterKey', key);
        setMasterKey(key);
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    masterKey,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
