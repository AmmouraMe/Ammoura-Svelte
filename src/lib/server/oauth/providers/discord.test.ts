import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordOAuthProvider } from './discord';

describe('DiscordOAuthProvider', () => {
  let provider: DiscordOAuthProvider;

  function normalize(raw: Record<string, unknown>) {
    return (
      provider as unknown as { normalizeUserProfile: (profile: unknown) => unknown }
    ).normalizeUserProfile(raw);
  }

  beforeEach(() => {
    provider = new DiscordOAuthProvider('discord-client-id', 'discord-client-secret');
  });

  it('should initialize with correct config', () => {
    expect(provider.name).toBe('discord');
  });

  it('should normalize user profile correctly', () => {
    const normalized = normalize({
      id: '293484886726279168',
      username: 'davis9001',
      global_name: 'David',
      avatar: 'abc123',
      email: 'user@example.com',
      verified: true
    });

    expect(normalized).toEqual({
      id: '293484886726279168',
      email: 'user@example.com',
      name: 'David',
      picture: 'https://cdn.discordapp.com/avatars/293484886726279168/abc123.png',
      email_verified: true
    });
  });

  it('falls back to the legacy username when there is no display name', () => {
    const normalized = normalize({ id: '1', username: 'davis9001', email: 'u@example.com' }) as {
      name: string;
    };

    expect(normalized.name).toBe('davis9001');
  });

  it('requests an animated avatar as .gif', () => {
    const normalized = normalize({ id: '1', avatar: 'a_deadbeef' }) as { picture: string };

    expect(normalized.picture).toBe('https://cdn.discordapp.com/avatars/1/a_deadbeef.gif');
  });

  it('returns no picture when the account has no avatar', () => {
    expect((normalize({ id: '1', avatar: null }) as { picture: string }).picture).toBe('');
    expect((normalize({ id: '1' }) as { picture: string }).picture).toBe('');
  });

  it('treats an unverified email as unverified', () => {
    const normalized = normalize({ id: '1', email: 'u@example.com', verified: false }) as {
      email_verified: boolean;
    };

    expect(normalized.email_verified).toBe(false);
  });

  it('should handle missing fields in profile', () => {
    expect(normalize({})).toEqual({
      id: '',
      email: '',
      name: '',
      picture: '',
      email_verified: false
    });
  });
});
