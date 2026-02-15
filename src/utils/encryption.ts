import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Encryption utilities for end-to-end encrypted cloud sync
 * Uses AES-256 encryption with PBKDF2 key derivation
 * Uses expo-crypto for React Native compatible random number generation
 */

const ITERATIONS = 100000; // PBKDF2 iterations
const KEY_SIZE = 256 / 32; // 256 bits = 8 words

/**
 * Generate a master encryption key from user password
 * @param password User's password
 * @param salt Unique salt for this user (stored in Firestore)
 * @returns Derived encryption key
 */
export function generateMasterKey(password: string, salt: string): string {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
  });
  return key.toString();
}

/**
 * Generate a random salt for new users
 * Uses expo-crypto for React Native compatibility
 * @returns Random hex string
 */
export function generateSalt(): string {
  // Use CryptoJS random for compatibility - it works cross-platform
  const randomWords = CryptoJS.lib.WordArray.random(16);
  return randomWords.toString();
}

/**
 * Encrypt data with AES-256
 * Uses expo-crypto for React Native compatible random IV generation
 * @param data Any serializable data
 * @param masterKey Encryption key
 * @returns Encrypted string with IV prepended
 */
export function encryptData(data: any, masterKey: string): string {
  try {
    // Check if CryptoJS is available
    if (!CryptoJS || !CryptoJS.AES) {
      throw new Error('CryptoJS not properly loaded');
    }
    
    // Stringify the data
    let dataString: string;
    try {
      dataString = JSON.stringify(data);
    } catch (stringifyError: any) {
      throw new Error(`Failed to stringify data: ${stringifyError.message}`);
    }
    
    // Generate random IV using CryptoJS (works cross-platform)
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt with explicit IV
    try {
      const encrypted = CryptoJS.AES.encrypt(dataString, masterKey, { iv });
      return encrypted.toString();
    } catch (encryptError: any) {
      throw new Error(`AES encryption failed: ${encryptError.message}`);
    }
  } catch (error: any) {
    console.error('encryptData error:', error);
    throw error;
  }
}

/**
 * Decrypt AES-256 encrypted data
 * @param encryptedData Encrypted string
 * @param masterKey Decryption key
 * @returns Original data
 */
export function decryptData(encryptedData: string, masterKey: string): any {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, masterKey);
  const dataString = decrypted.toString(CryptoJS.enc.Utf8);
  
  if (!dataString) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
  
  return JSON.parse(dataString);
}

/**
 * Hash a password for storage (one-way)
 * @param password Plain text password
 * @returns Hashed password
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: 'Password is strong' };
}
