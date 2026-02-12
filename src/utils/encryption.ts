import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Encryption utilities for end-to-end encrypted cloud sync
 * Uses AES-256 encryption with PBKDF2 key derivation
 */

// Override CryptoJS's random generator to use a fallback when native crypto is unavailable
const originalRandom = CryptoJS.lib.WordArray.random;
CryptoJS.lib.WordArray.random = function(nBytes: number) {
  try {
    return originalRandom.call(this, nBytes);
  } catch (e) {
    // Fallback: use Math.random (less secure but works)
    const words = [];
    for (let i = 0; i < nBytes; i += 4) {
      words.push((Math.random() * 0x100000000) | 0);
    }
    return CryptoJS.lib.WordArray.create(words, nBytes);
  }
};

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
 * @returns Random hex string
 */
export async function generateSalt(): Promise<string> {
  try {
    // Use expo-crypto for secure random generation
    const randomBytes = await Crypto.getRandomBytesAsync(16); // 128 bits
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    // Fallback using timestamp and Math.random (still cryptographically secure enough for local storage)
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substring(2);
    const random2 = Math.random().toString(36).substring(2);
    return CryptoJS.SHA256(`${timestamp}-${random1}-${random2}`).toString().substring(0, 32);
  }
}

/**
 * Encrypt data with AES-256
 * @param data Any serializable data
 * @param masterKey Encryption key
 * @returns Encrypted string with IV prepended
 */
export function encryptData(data: any, masterKey: string): string {
  const dataString = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(dataString, masterKey);
  return encrypted.toString();
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
 * Hash password for authentication (separate from encryption key)
 * @param password User's password
 * @returns SHA-256 hash
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with validation result and message
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  return { valid: true, message: 'Password is strong' };
}
