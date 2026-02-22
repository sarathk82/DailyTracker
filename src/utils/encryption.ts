import aes from 'aes-js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Encryption utilities for end-to-end encrypted cloud sync
 * Uses AES-256-CTR encryption - React Native compatible
 * Pure JavaScript implementation, no native dependencies
 * 
 * Security improvements (Feb 2026):
 * - Replaced custom KDF with industry-standard PBKDF2-HMAC-SHA256
 * - Increased iterations from 1,000 to 100,000 (OWASP recommendation)
 * - Removed Math.random() fallback (requires crypto.getRandomValues)
 */

const KEY_SIZE = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000; // OWASP recommendation for 2024+

/**
 * Generate a master encryption key from user password using PBKDF2
 * Uses industry-standard PBKDF2-HMAC-SHA256 with 100,000 iterations
 * @param password User's password
 * @param salt Unique salt for this user (stored in Firestore)
 * @returns Derived encryption key as hex string
 */
export async function generateMasterKey(password: string, salt: string): Promise<string> {
  // Convert password and salt to Uint8Array
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const saltBytes = encoder.encode(salt);
  
  // Derive key using PBKDF2-HMAC-SHA256 with 100,000 iterations
  const keyBytes = pbkdf2(sha256, passwordBytes, saltBytes, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_SIZE
  });
  
  return Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure random salt for new users
 * Requires crypto.getRandomValues - no insecure fallback
 * @returns Random hex string (32 characters = 16 bytes)
 * @throws Error if crypto.getRandomValues is unavailable
 */
export function generateSalt(): string {
  // Require crypto.getRandomValues - no Math.random() fallback for security
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('crypto.getRandomValues is required but unavailable. Cannot generate secure salt.');
  }
  
  // Generate 16 random bytes
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt data with AES-256-CTR
 * React Native compatible, uses aes-js pure JavaScript implementation
 * @param data Any serializable data
 * @param masterKey Encryption key (hex string)
 * @returns Encrypted string (hex encoded with IV prepended)
 */
export function encryptData(data: any, masterKey: string): string {
  try {
    // Stringify the data
    const dataString = JSON.stringify(data);
    const textBytes = aes.utils.utf8.toBytes(dataString);
    
    // Convert hex key to bytes (32 bytes for AES-256)
    let keyBytes: Uint8Array;
    if (masterKey.length === 64) {
      // Already hex string
      keyBytes = new Uint8Array(masterKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    } else {
      // Convert string to bytes and pad/truncate to 32 bytes
      const encoder = new TextEncoder();
      const rawKey = encoder.encode(masterKey);
      keyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        keyBytes[i] = rawKey[i % rawKey.length];
      }
    }
    
    // Generate cryptographically secure random IV (16 bytes)
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('crypto.getRandomValues is required for secure encryption');
    }
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    
    // Create Counter for CTR mode
    const counter = new aes.Counter(iv);
    
    // Encrypt using AES-256-CTR
    const aesCtr = new aes.ModeOfOperation.ctr(keyBytes, counter);
    const encryptedBytes = aesCtr.encrypt(textBytes);
    
    // Return IV + encrypted data as hex
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv);
    combined.set(encryptedBytes, iv.length);
    
    return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error: any) {
    console.error('encryptData error:', error);
    throw error;
  }
}

/**
 * Decrypt AES-256-CTR encrypted data
 * @param encryptedData Encrypted hex string (IV prepended)
 * @param masterKey Decryption key (hex string)
 * @returns Original data
 */
export function decryptData(encryptedData: string, masterKey: string): any {
  try {
    // Convert hex string to bytes
    const encryptedBytes = new Uint8Array(
      encryptedData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    // Extract IV (first 16 bytes) and ciphertext
    const iv = encryptedBytes.slice(0, 16);
    const ciphertext = encryptedBytes.slice(16);
    
    // Convert hex key to bytes
    let keyBytes: Uint8Array;
    if (masterKey.length === 64) {
      keyBytes = new Uint8Array(masterKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    } else {
      const encoder = new TextEncoder();
      const rawKey = encoder.encode(masterKey);
      keyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        keyBytes[i] = rawKey[i % rawKey.length];
      }
    }
    
    // Create Counter for CTR mode
    const counter = new aes.Counter(iv);
    
    // Decrypt using AES-256-CTR
    const aesCtr = new aes.ModeOfOperation.ctr(keyBytes, counter);
    const decryptedBytes = aesCtr.decrypt(ciphertext);
    
    // Convert bytes to string
    const dataString = aes.utils.utf8.fromBytes(decryptedBytes);
    
    if (!dataString) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return JSON.parse(dataString);
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash a password for storage (one-way)
 * Simple hash implementation for React Native compatibility
 * @param password Plain text password
 * @returns Hashed password (hex string)
 */
export function hashPassword(password: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Simple hash using repeated transformations
  let hash = new Uint8Array(32);
  for (let i = 0; i < data.length; i++) {
    hash[i % 32] ^= data[i];
    hash[(i + 1) % 32] ^= data[i] << 1;
  }
  
  // Additional mixing
  for (let round = 0; round < 100; round++) {
    for (let i = 0; i < 32; i++) {
      hash[i] ^= hash[(i + 1) % 32];
      hash[i] = (hash[i] << 1) | (hash[i] >> 7);
    }
  }
  
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
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
