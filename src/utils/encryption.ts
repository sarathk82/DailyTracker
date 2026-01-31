import CryptoJS from 'crypto-js';

/**
 * Encryption utilities for end-to-end encrypted cloud sync
 * Uses AES-256 encryption with PBKDF2 key derivation
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
 * @returns Random hex string
 */
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
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
