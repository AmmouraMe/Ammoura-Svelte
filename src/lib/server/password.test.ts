import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isLegacyHash } from './password';

describe('password', () => {
  describe('hashPassword', () => {
    it('should produce a pbkdf2-format hash', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(hash.startsWith('pbkdf2$')).toBe(true);
      expect(hash.split('$')).toHaveLength(4);
    });

    it('should produce unique hashes for the same password (random salt)', async () => {
      const a = await hashPassword('same-password');
      const b = await hashPassword('same-password');
      expect(a).not.toEqual(b);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const hash = await hashPassword('my-secret-password');
      expect(await verifyPassword('my-secret-password', hash)).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await hashPassword('my-secret-password');
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should verify against a legacy unsalted SHA-256 hex hash', async () => {
      // sha256('password123') hex
      const legacy = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';
      expect(await verifyPassword('password123', legacy)).toBe(true);
      expect(await verifyPassword('not-it', legacy)).toBe(false);
    });

    it('should reject malformed pbkdf2 hashes', async () => {
      expect(await verifyPassword('x', 'pbkdf2$broken')).toBe(false);
      expect(await verifyPassword('x', 'pbkdf2$NaN$!!$!!')).toBe(false);
    });
  });

  describe('isLegacyHash', () => {
    it('should detect legacy vs pbkdf2 formats', async () => {
      expect(isLegacyHash('ef92b778bafe771e89245b89ecbc08a4')).toBe(true);
      expect(isLegacyHash(await hashPassword('x'))).toBe(false);
    });
  });
});
