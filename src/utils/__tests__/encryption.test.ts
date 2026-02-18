import { generateMasterKey, generateSalt, encryptData, decryptData, hashPassword, validatePassword } from '../encryption';

describe('Encryption Utilities', () => {
  describe('generateSalt', () => {
    it('should generate a random salt', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).toBeTruthy();
      expect(salt2).toBeTruthy();
      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBeGreaterThan(0);
    });
  });

  describe('generateMasterKey', () => {
    it('should generate a consistent key from password and salt', async () => {
      const password = 'test-password-123';
      const salt = 'test-salt-456';
      
      const key1 = await generateMasterKey(password, salt);
      const key2 = await generateMasterKey(password, salt);
      
      expect(key1).toEqual(key2);
      expect(key1).toBeTruthy();
    });

    it('should generate different keys for different passwords', async () => {
      const salt = 'test-salt';
      const key1 = await generateMasterKey('password1', salt);
      const key2 = await generateMasterKey('password2', salt);
      
      expect(key1).not.toEqual(key2);
    });

    it('should generate different keys for different salts', async () => {
      const password = 'test-password';
      const key1 = await generateMasterKey(password, 'salt1');
      const key2 = await generateMasterKey(password, 'salt2');
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('encryptData and decryptData', () => {
    let masterKey: string;

    beforeAll(async () => {
      masterKey = await generateMasterKey('test-password', 'test-salt');
    });

    it('should encrypt and decrypt simple objects', () => {
      const data = { message: 'Hello, World!', count: 42 };
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(encrypted).not.toBe(JSON.stringify(data));
      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt arrays', () => {
      const data = [1, 2, 3, 4, 5];
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt complex nested objects', () => {
      const data = {
        user: { name: 'John', age: 30 },
        items: [{ id: 1, text: 'Item 1' }, { id: 2, text: 'Item 2' }],
        settings: { theme: 'dark', notifications: true }
      };
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toEqual(data);
    });

    it('should throw error when decrypting with wrong key', async () => {
      const data = { message: 'Secret' };
      const encrypted = encryptData(data, masterKey);
      const wrongKey = await generateMasterKey('wrong-password', 'test-salt');
      
      expect(() => decryptData(encrypted, wrongKey)).toThrow();
    });

    it('should handle empty objects', () => {
      const data = {};
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toEqual(data);
    });

    it('should handle strings', () => {
      const data = 'Simple string';
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toBe(data);
    });

    it('should handle numbers', () => {
      const data = 12345;
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toBe(data);
    });

    it('should handle booleans', () => {
      const data = true;
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toBe(data);
    });

    it('should handle null', () => {
      const data = null;
      
      const encrypted = encryptData(data, masterKey);
      const decrypted = decryptData(encrypted, masterKey);
      
      expect(decrypted).toBe(data);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password consistently', () => {
      const password = 'my-secure-password';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for different passwords', () => {
      const hash1 = hashPassword('password1');
      const hash2 = hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce a hex string', () => {
      const hash = hashPassword('test');
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept valid passwords', () => {
      const result = validatePassword('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('strong');
    });

    it('should accept complex valid passwords', () => {
      const result = validatePassword('MySecure123Password!');
      expect(result.valid).toBe(true);
    });
  });
});

