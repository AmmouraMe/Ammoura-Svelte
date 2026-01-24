import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIProvider } from './providers';
import type { AICompletionRequest } from './providers';

// Mock the OpenAI and Anthropic modules
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
        stream: vi.fn()
      }
    }))
  };
});

describe('AI Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAIProvider', () => {
    it('should create OpenAI provider', () => {
      const provider = createAIProvider('openai', 'test-key');
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should create Anthropic provider', () => {
      const provider = createAIProvider('anthropic', 'test-key');
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('anthropic');
    });

    it('should throw error for Grok provider (not implemented)', () => {
      expect(() => createAIProvider('grok', 'test-key')).toThrow(
        'Grok provider not yet implemented'
      );
    });

    it('should throw error for unknown provider', () => {
      expect(() => createAIProvider('unknown' as never, 'test-key')).toThrow(
        'Unknown provider: unknown'
      );
    });
  });

  describe('OpenAI Provider', () => {
    let provider: ReturnType<typeof createAIProvider>;

    beforeEach(() => {
      provider = createAIProvider('openai', 'test-api-key');
    });

    describe('getProviderName', () => {
      it('should return openai', () => {
        expect(provider.getProviderName()).toBe('openai');
      });
    });

    describe('supportsVision', () => {
      it('should support vision for gpt-4o', () => {
        expect(provider.supportsVision('gpt-4o')).toBe(true);
      });

      it('should support vision for gpt-4o-mini', () => {
        expect(provider.supportsVision('gpt-4o-mini')).toBe(true);
      });

      it('should not support vision for claude-3-5-sonnet-20241022', () => {
        expect(provider.supportsVision('claude-3-5-sonnet-20241022')).toBe(false);
      });

      it('should not support vision for grok-beta', () => {
        expect(provider.supportsVision('grok-beta')).toBe(false);
      });
    });

    describe('streamCompletion', () => {
      it('should stream completion with text messages', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [
                {
                  delta: { content: 'Hello' },
                  finish_reason: null
                }
              ]
            };
            yield {
              choices: [
                {
                  delta: { content: ' World' },
                  finish_reason: 'stop'
                }
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15
              }
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate
            }
          }
        }));

        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test message', timestamp: Date.now() }],
          model: 'gpt-4o',
          temperature: 0.7
        };

        const chunks: string[] = [];
        for await (const chunk of provider.streamCompletion(request)) {
          if (chunk.content) {
            chunks.push(chunk.content);
          }
        }

        expect(chunks).toEqual(['Hello', ' World']);
      });

      it('should handle system prompt', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [
                {
                  delta: { content: 'Response' },
                  finish_reason: 'stop'
                }
              ]
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate
            }
          }
        }));

        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o',
          systemPrompt: 'You are a helpful assistant'
        };

        for await (const _ of provider.streamCompletion(request)) {
          // Just iterate
        }

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'system', content: 'You are a helpful assistant' })
            ])
          })
        );
      });

      it('should handle images in messages', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [
                {
                  delta: { content: 'Image response' },
                  finish_reason: 'stop'
                }
              ]
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate
            }
          }
        }));

        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'What is this?',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'img1',
                  type: 'image',
                  url: 'data:image/jpeg;base64,ABC123',
                  mimeType: 'image/jpeg',
                  filename: 'test.jpg',
                  size: 1024
                }
              ]
            }
          ],
          model: 'gpt-4o'
        };

        for await (const _ of provider.streamCompletion(request)) {
          // Just iterate
        }

        expect(mockCreate).toHaveBeenCalled();
      });
    });

    describe('getCompletion', () => {
      it('should get non-streaming completion', async () => {
        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        });

        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate
            }
          }
        }));

        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o'
        };

        const result = await provider.getCompletion(request);

        expect(result.content).toBe('Test response');
        expect(result.usage.inputTokens).toBe(10);
        expect(result.usage.outputTokens).toBe(5);
        expect(result.usage.totalTokens).toBe(15);
        expect(result.finishReason).toBe('stop');
      });

      it('should use custom temperature and maxTokens', async () => {
        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop'
            }
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        });

        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: {
            completions: {
              create: mockCreate
            }
          }
        }));

        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o-mini',
          temperature: 0.9,
          maxTokens: 2000
        };

        await provider.getCompletion(request);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.9,
            max_tokens: 2000
          })
        );
      });
    });
  });

  describe('Anthropic Provider', () => {
    let provider: ReturnType<typeof createAIProvider>;

    beforeEach(() => {
      provider = createAIProvider('anthropic', 'test-api-key');
    });

    describe('getProviderName', () => {
      it('should return anthropic', () => {
        expect(provider.getProviderName()).toBe('anthropic');
      });
    });

    describe('supportsVision', () => {
      it('should support vision for claude-sonnet-4-20250514', () => {
        expect(provider.supportsVision('claude-sonnet-4-20250514')).toBe(true);
      });

      it('should support vision for claude-3-5-sonnet-20241022', () => {
        expect(provider.supportsVision('claude-3-5-sonnet-20241022')).toBe(true);
      });

      it('should support vision for claude-3-5-haiku-20241022', () => {
        expect(provider.supportsVision('claude-3-5-haiku-20241022')).toBe(true);
      });

      it('should not support vision for gpt-4o', () => {
        expect(provider.supportsVision('gpt-4o')).toBe(false);
      });

      it('should not support vision for gpt-4o-mini', () => {
        expect(provider.supportsVision('gpt-4o-mini')).toBe(false);
      });
    });

    describe('streamCompletion', () => {
      it('should stream completion with text messages', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Hello' }
            };
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: ' Claude' }
            };
            yield {
              type: 'message_stop'
            };
          },
          on: vi.fn(),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 10, output_tokens: 5 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);
        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            stream: mockStream2
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'claude-3-5-sonnet-20241022'
        };

        const chunks: string[] = [];
        for await (const chunk of provider.streamCompletion(request)) {
          if (chunk.content) {
            chunks.push(chunk.content);
          }
        }

        expect(chunks).toEqual(['Hello', ' Claude']);
      });

      it('should skip system messages in Anthropic format', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Response' }
            };
            yield {
              type: 'message_stop'
            };
          },
          on: vi.fn(),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 10, output_tokens: 5 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);
        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            stream: mockStream2
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            { role: 'system', content: 'System prompt', timestamp: Date.now() },
            { role: 'user', content: 'Test', timestamp: Date.now() }
          ],
          model: 'claude-3-5-sonnet-20241022',
          systemPrompt: 'System prompt'
        };

        for await (const _ of provider.streamCompletion(request)) {
          // Just iterate
        }

        expect(mockStream2).toHaveBeenCalledWith(
          expect.objectContaining({
            system: 'System prompt',
            messages: expect.arrayContaining([expect.objectContaining({ role: 'user' })])
          })
        );
      });

      it('should handle images in Anthropic format', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'I see an image' }
            };
            yield {
              type: 'message_stop'
            };
          },
          on: vi.fn(),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 20, output_tokens: 10 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);
        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            stream: mockStream2
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'What is this?',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'img1',
                  type: 'image',
                  url: 'data:image/png;base64,iVBORw0KGgo',
                  mimeType: 'image/png',
                  filename: 'test.png',
                  size: 1024
                }
              ]
            }
          ],
          model: 'claude-3-5-sonnet-20241022'
        };

        for await (const _ of provider.streamCompletion(request)) {
          // Just iterate
        }

        expect(mockStream2).toHaveBeenCalled();
      });

      it('should handle usage information when available', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Response' }
            };
            yield {
              type: 'message_delta',
              usage: { output_tokens: 5 }
            };
            yield {
              type: 'message_stop'
            };
          },
          on: vi
            .fn()
            .mockImplementation(
              (
                event: string,
                handler: (data: { usage: { input_tokens: number; output_tokens: number } }) => void
              ) => {
                if (event === 'message') {
                  handler({ usage: { input_tokens: 10, output_tokens: 5 } });
                }
              }
            ),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 10, output_tokens: 5 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);
        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            stream: mockStream2
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'claude-3-5-sonnet-20241022'
        };

        let finalChunk;
        for await (const chunk of provider.streamCompletion(request)) {
          finalChunk = chunk;
        }

        expect(finalChunk?.done).toBe(true);
      });
    });

    describe('getCompletion', () => {
      it('should get non-streaming completion', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Claude response' }],
          usage: {
            input_tokens: 10,
            output_tokens: 5
          },
          stop_reason: 'end_turn'
        });

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'claude-3-5-sonnet-20241022'
        };

        const result = await provider.getCompletion(request);

        expect(result.content).toBe('Claude response');
        expect(result.usage.inputTokens).toBe(10);
        expect(result.usage.outputTokens).toBe(5);
        expect(result.usage.totalTokens).toBe(15);
        expect(result.finishReason).toBe('end_turn');
      });

      it('should use default temperature and maxTokens', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 1, output_tokens: 1 },
          stop_reason: 'end_turn'
        });

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'claude-3-5-sonnet-20241022'
        };

        await provider.getCompletion(request);

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.7,
            max_tokens: 4096
          })
        );
      });

      it('should handle multiple content blocks', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: ' Second part' }
          ],
          usage: { input_tokens: 1, output_tokens: 1 },
          stop_reason: 'end_turn'
        });

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'claude-3-5-sonnet-20241022'
        };

        const result = await provider.getCompletion(request);

        expect(result.content).toBe('First part Second part');
      });

      it('should handle image attachments with base64 data', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Image analyzed' }],
          usage: { input_tokens: 1, output_tokens: 1 },
          stop_reason: 'end_turn'
        });

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'Analyze',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'img1',
                  type: 'image',
                  url: 'data:image/jpeg;base64,/9j/4AAQ',
                  mimeType: 'image/jpeg',
                  filename: 'test.jpg',
                  size: 1024
                }
              ]
            }
          ],
          model: 'claude-3-5-sonnet-20241022'
        };

        await provider.getCompletion(request);

        expect(mockCreate).toHaveBeenCalled();
      });

      it('should handle different image MIME types', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'OK' }],
          usage: { input_tokens: 1, output_tokens: 1 },
          stop_reason: 'end_turn'
        });

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const mimeTypes = ['image/png', 'image/gif', 'image/webp', 'image/jpeg'];

        for (const mimeType of mimeTypes) {
          mockCreate.mockClear();

          const request: AICompletionRequest = {
            messages: [
              {
                role: 'user',
                content: 'Test',
                timestamp: Date.now(),
                attachments: [
                  {
                    id: 'img1',
                    type: 'image',
                    url: `data:${mimeType};base64,ABC`,
                    mimeType,
                    filename: 'test.img',
                    size: 1024
                  }
                ]
              }
            ],
            model: 'claude-3-5-sonnet-20241022'
          };

          await provider.getCompletion(request);

          expect(mockCreate).toHaveBeenCalled();
        }
      });

      it('should skip non-data URI images with warning', async () => {
        const Anthropic = await import('@anthropic-ai/sdk');
        const mockCreate = vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'OK' }],
          usage: { input_tokens: 1, output_tokens: 1 },
          stop_reason: 'end_turn'
        });

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: {
            create: mockCreate
          }
        }));

        provider = createAIProvider('anthropic', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'Test',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'img1',
                  type: 'image',
                  url: 'https://example.com/image.jpg',
                  mimeType: 'image/jpeg',
                  filename: 'test.jpg',
                  size: 1024
                }
              ]
            }
          ],
          model: 'claude-3-5-sonnet-20241022'
        };

        await provider.getCompletion(request);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Non-data URI image URL'),
          'https://example.com/image.jpg'
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });
});
