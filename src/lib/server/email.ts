/**
 * Outbound email via Resend (tenancy plan T1). Degrades gracefully: without a
 * RESEND_API_KEY (local dev), emails are logged to the console instead of
 * sent, so flows remain testable end-to-end.
 */

import type { FetchLike } from './dns.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Ammoura <no-reply@ammoura.me>';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface SendResult {
  sent: boolean;
  devLogged?: boolean;
  error?: string;
}

export async function sendEmail(
  env: Record<string, unknown> | undefined,
  message: EmailMessage,
  fetchImpl: FetchLike = fetch
): Promise<SendResult> {
  const apiKey = env?.RESEND_API_KEY as string | undefined;

  if (!apiKey) {
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { sent: false, devLogged: true };
  }

  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: (env?.EMAIL_FROM as string) || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Resend error ${response.status}: ${body.slice(0, 200)}`);
      return { sent: false, error: `Resend responded ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error('Email send failed:', error);
    return { sent: false, error: 'send failed' };
  }
}

export function buildVerificationEmail(name: string, verifyUrl: string): Omit<EmailMessage, 'to'> {
  return {
    subject: 'Verify your email',
    text: [
      `Hi ${name},`,
      '',
      'Confirm your email address to finish setting up your account:',
      '',
      verifyUrl,
      '',
      'This link expires in 24 hours. If you did not create an account, ignore this email.'
    ].join('\n')
  };
}
