import { describe, it, expect, vi } from 'vitest';
import { sendEmail, buildVerificationEmail } from './email';

describe('email', () => {
  describe('sendEmail', () => {
    it('should log instead of sending when no API key is configured', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const fetchImpl = vi.fn();

      const result = await sendEmail(undefined, {
        to: 'a@b.co',
        subject: 'Hello',
        text: 'Body'
      });

      expect(result).toEqual({ sent: false, devLogged: true });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should POST to Resend with the API key', async () => {
      const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
      const result = await sendEmail(
        { RESEND_API_KEY: 'key', EMAIL_FROM: 'X <x@y.z>' },
        { to: 'a@b.co', subject: 'Hi', text: 'Body' },
        fetchImpl
      );

      expect(result.sent).toBe(true);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect((init.headers as Record<string, string>).authorization).toBe('Bearer key');
      expect(JSON.parse(init.body as string)).toMatchObject({
        from: 'X <x@y.z>',
        to: ['a@b.co'],
        subject: 'Hi'
      });
    });

    it('should report failures without throwing', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchImpl = vi.fn(
        async () => ({ ok: false, status: 422, text: async () => 'bad' }) as Response
      );
      const result = await sendEmail(
        { RESEND_API_KEY: 'key' },
        { to: 'a@b.co', subject: 'Hi', text: 'Body' },
        fetchImpl
      );
      expect(result.sent).toBe(false);
      expect(result.error).toContain('422');
      errSpy.mockRestore();
    });
  });

  describe('buildVerificationEmail', () => {
    it('should include the name and link', () => {
      const email = buildVerificationEmail('Dave', 'https://x.y/verify-email?token=t');
      expect(email.subject).toBe('Verify your email');
      expect(email.text).toContain('Hi Dave');
      expect(email.text).toContain('https://x.y/verify-email?token=t');
    });
  });
});
