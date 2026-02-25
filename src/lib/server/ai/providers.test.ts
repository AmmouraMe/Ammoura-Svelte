import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIProvider } from './providers';
import type { AICompletionRequest } from './providers';
import type { AIProvider } from '$lib/types/ai-chat';

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

    describe('streamCompletion with non-data URI images', () => {
      it('should skip non-data URI images during streaming with warning', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Response' }
            };
            yield { type: 'message_stop' };
          },
          on: vi.fn(),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 1, output_tokens: 1 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: { stream: mockStream2 }
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

        const chunks: string[] = [];
        for await (const chunk of provider.streamCompletion(request)) {
          if (chunk.content) chunks.push(chunk.content);
        }

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Non-data URI image URL'),
          'https://example.com/image.jpg'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle valid png mediaType in streaming', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'OK' }
            };
            yield { type: 'message_stop' };
          },
          on: vi.fn(),
          finalMessage: vi.fn().mockResolvedValue({
            usage: { input_tokens: 1, output_tokens: 1 }
          })
        };

        const Anthropic = await import('@anthropic-ai/sdk');
        const mockStream2 = vi.fn().mockResolvedValue(mockStream);

        (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          messages: { stream: mockStream2 }
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
                  url: 'data:image/png;base64,iVBORw0KGgoAAAANS',
                  mimeType: 'image/png',
                  filename: 'test.png',
                  size: 1024
                }
              ]
            }
          ],
          model: 'claude-3-5-sonnet-20241022'
        };

        const chunks: string[] = [];
        for await (const chunk of provider.streamCompletion(request)) {
          if (chunk.content) chunks.push(chunk.content);
        }

        expect(chunks).toContain('OK');
        // Verify stream was called with the correct media type
        expect(mockStream2).toHaveBeenCalled();
      });
    });
  });

  describe('OpenAI Provider - additional branch coverage', () => {
    let provider: ReturnType<typeof createAIProvider>;

    beforeEach(() => {
      provider = createAIProvider('openai', 'test-key');
    });

    describe('streamCompletion additional branches', () => {
      it('should handle user message without attachments in streaming', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [{ delta: { content: 'Hi' }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            { role: 'user', content: 'No attachments here', timestamp: Date.now() },
            { role: 'assistant', content: 'Previous response', timestamp: Date.now() }
          ],
          model: 'gpt-4o'
        };

        const chunks: string[] = [];
        for await (const chunk of provider.streamCompletion(request)) {
          if (chunk.content) chunks.push(chunk.content);
        }
        expect(chunks).toEqual(['Hi']);
        // Should have plain text messages, not multimodal
        const callMessages = mockCreate.mock.calls[0][0].messages;
        expect(callMessages[0]).toEqual({ role: 'user', content: 'No attachments here' });
        expect(callMessages[1]).toEqual({ role: 'assistant', content: 'Previous response' });
      });

      it('should skip non-image attachments in streaming', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [{ delta: { content: 'Done' }, finish_reason: 'stop' }]
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'Check this file',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'f1',
                  type: 'file' as unknown as 'image',
                  url: 'https://example.com/doc.pdf',
                  mimeType: 'application/pdf',
                  filename: 'doc.pdf',
                  size: 5000
                }
              ]
            }
          ],
          model: 'gpt-4o'
        };

        for await (const _ of provider.streamCompletion(request)) {
          // iterate
        }

        // The message should have text content but no image_url
        const msgContent = mockCreate.mock.calls[0][0].messages[0].content;
        expect(msgContent).toEqual([{ type: 'text', text: 'Check this file' }]);
      });

      it('should handle stream chunks without usage data', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [{ delta: { content: 'Hello' }, finish_reason: null }]
            };
            yield {
              choices: [{ delta: { content: ' World' }, finish_reason: 'stop' }]
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o'
        };

        const allChunks: Array<{ content: string; done: boolean; usage?: unknown }> = [];
        for await (const chunk of provider.streamCompletion(request)) {
          allChunks.push(chunk);
        }

        // Last chunk should have done: true but no usage
        const lastChunk = allChunks[allChunks.length - 1];
        expect(lastChunk.done).toBe(true);
        expect(lastChunk.usage).toBeUndefined();
      });

      it('should handle stream without finish_reason', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [{ delta: { content: 'Hello' }, finish_reason: null }]
            };
          }
        };

        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue(mockStream);
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o'
        };

        const allChunks: Array<{ content: string; done: boolean }> = [];
        for await (const chunk of provider.streamCompletion(request)) {
          allChunks.push(chunk);
        }

        // Should have content chunks but no final done chunk (no finish_reason)
        expect(allChunks.every((c) => !c.done)).toBe(true);
      });

      it('should throw non-Error values as-is', async () => {
        const openai = await import('openai');
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: vi.fn().mockRejectedValue('string error') } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o'
        };

        await expect(async () => {
          for await (const _ of provider.streamCompletion(request)) {
            // iterate
          }
        }).rejects.toBe('string error');
      });
    });

    describe('getCompletion additional branches', () => {
      it('should handle getCompletion without systemPrompt', async () => {
        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
        });
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
          model: 'gpt-4o'
          // No systemPrompt
        };

        const result = await provider.getCompletion(request);
        expect(result.content).toBe('Reply');
        // No system message should be present
        const messages = mockCreate.mock.calls[0][0].messages;
        expect(messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
      });

      it('should skip non-image attachments in getCompletion', async () => {
        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        });
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            {
              role: 'user',
              content: 'Check file',
              timestamp: Date.now(),
              attachments: [
                {
                  id: 'f1',
                  type: 'file' as unknown as 'image',
                  url: 'https://example.com/doc.pdf',
                  mimeType: 'application/pdf',
                  filename: 'doc.pdf',
                  size: 5000
                }
              ]
            }
          ],
          model: 'gpt-4o'
        };

        const result = await provider.getCompletion(request);
        expect(result.content).toBe('OK');
        const msgContent = mockCreate.mock.calls[0][0].messages[0].content;
        expect(msgContent).toEqual([{ type: 'text', text: 'Check file' }]);
      });

      it('should handle assistant messages without attachments in getCompletion', async () => {
        const openai = await import('openai');
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        });
        (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
          chat: { completions: { create: mockCreate } }
        }));
        provider = createAIProvider('openai', 'test-key');

        const request: AICompletionRequest = {
          messages: [
            { role: 'user', content: 'Hello', timestamp: Date.now() },
            { role: 'assistant', content: 'Hi!', timestamp: Date.now() },
            { role: 'user', content: 'Test', timestamp: Date.now() }
          ],
          model: 'gpt-4o'
        };

        const result = await provider.getCompletion(request);
        expect(result.content).toBe('Reply');
        const messages = mockCreate.mock.calls[0][0].messages;
        expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi!' });
      });
    });
  });

  describe('Anthropic Provider - additional branch coverage', () => {
    let provider: ReturnType<typeof createAIProvider>;

    beforeEach(() => {
      provider = createAIProvider('anthropic', 'test-key');
    });

    it('should handle finalMessage without usage data', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Response' }
          };
          yield { type: 'message_stop' };
        },
        on: vi.fn(),
        finalMessage: vi.fn().mockResolvedValue({})
      };

      const Anthropic = await import('@anthropic-ai/sdk');
      (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        messages: { stream: vi.fn().mockResolvedValue(mockStream) }
      }));
      provider = createAIProvider('anthropic', 'test-key');

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
        model: 'claude-3-5-sonnet-20241022'
      };

      const allChunks: Array<{ content: string; done: boolean; usage?: unknown }> = [];
      for await (const chunk of provider.streamCompletion(request)) {
        allChunks.push(chunk);
      }

      const lastChunk = allChunks[allChunks.length - 1];
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.usage).toBeUndefined();
    });

    it('should handle Anthropic streaming with non-image attachment type', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'OK' }
          };
          yield { type: 'message_stop' };
        },
        on: vi.fn(),
        finalMessage: vi.fn().mockResolvedValue({ usage: { input_tokens: 1, output_tokens: 1 } })
      };

      const Anthropic = await import('@anthropic-ai/sdk');
      const mockStreamFn = vi.fn().mockResolvedValue(mockStream);
      (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        messages: { stream: mockStreamFn }
      }));
      provider = createAIProvider('anthropic', 'test-key');

      const request: AICompletionRequest = {
        messages: [
          {
            role: 'user',
            content: 'Check file',
            timestamp: Date.now(),
            attachments: [
              {
                id: 'f1',
                type: 'file' as unknown as 'image',
                url: 'data:application/pdf;base64,AAAA',
                mimeType: 'application/pdf',
                filename: 'doc.pdf',
                size: 5000
              }
            ]
          }
        ],
        model: 'claude-3-5-sonnet-20241022'
      };

      for await (const _ of provider.streamCompletion(request)) {
        // iterate
      }

      // Non-image attachment should be skipped
      const callContent = mockStreamFn.mock.calls[0][0].messages[0].content;
      expect(callContent).toEqual([{ type: 'text', text: 'Check file' }]);
    });

    it('should handle Anthropic streaming with image falling back to jpeg', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'OK' }
          };
          yield { type: 'message_stop' };
        },
        on: vi.fn(),
        finalMessage: vi.fn().mockResolvedValue({ usage: { input_tokens: 1, output_tokens: 1 } })
      };

      const Anthropic = await import('@anthropic-ai/sdk');
      const mockStreamFn = vi.fn().mockResolvedValue(mockStream);
      (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        messages: { stream: mockStreamFn }
      }));
      provider = createAIProvider('anthropic', 'test-key');

      const request: AICompletionRequest = {
        messages: [
          {
            role: 'user',
            content: 'Check this',
            timestamp: Date.now(),
            attachments: [
              {
                id: 'img1',
                type: 'image',
                url: 'data:image/tiff;base64,AAAA',
                mimeType: 'image/tiff',
                filename: 'test.tiff',
                size: 1024
              }
            ]
          }
        ],
        model: 'claude-3-5-sonnet-20241022'
      };

      for await (const _ of provider.streamCompletion(request)) {
        // iterate
      }

      // Should fall back to image/jpeg for unsupported types
      const callContent = mockStreamFn.mock.calls[0][0].messages[0].content;
      const imageContent = callContent.find((c: { type: string }) => c.type === 'image');
      expect(imageContent.source.media_type).toBe('image/jpeg');
    });

    it('should handle Anthropic streaming with user message without attachments', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Reply' }
          };
          yield { type: 'message_stop' };
        },
        on: vi.fn(),
        finalMessage: vi.fn().mockResolvedValue({ usage: { input_tokens: 1, output_tokens: 1 } })
      };

      const Anthropic = await import('@anthropic-ai/sdk');
      const mockStreamFn = vi.fn().mockResolvedValue(mockStream);
      (Anthropic.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        messages: { stream: mockStreamFn }
      }));
      provider = createAIProvider('anthropic', 'test-key');

      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello', timestamp: Date.now() },
          { role: 'assistant', content: 'Hi', timestamp: Date.now() },
          { role: 'user', content: 'How are you?', timestamp: Date.now() }
        ],
        model: 'claude-3-5-sonnet-20241022'
      };

      for await (const _ of provider.streamCompletion(request)) {
        // iterate
      }

      const callMessages = mockStreamFn.mock.calls[0][0].messages;
      expect(callMessages[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(callMessages[1]).toEqual({ role: 'assistant', content: 'Hi' });
    });
  });

  describe('createAIProvider - grok and unknown', () => {
    it('should throw for grok provider', () => {
      expect(() => createAIProvider('grok', 'key')).toThrow('Grok provider not yet implemented');
    });

    it('should throw for unknown provider', () => {
      expect(() => createAIProvider('unknown-provider' as unknown as AIProvider, 'key')).toThrow(
        'Unknown provider: unknown-provider'
      );
    });
  });

  describe('OpenAI getCompletion - advanced', () => {
    it('should include systemPrompt as system message', async () => {
      const openai = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
      });
      (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const provider = createAIProvider('openai', 'test-key');
      await provider.getCompletion({
        messages: [{ role: 'user', content: 'Hi', timestamp: Date.now() }],
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful assistant'
      });

      const calls = mockCreate.mock.calls[0][0];
      expect(calls.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant' });
      expect(calls.messages[1]).toEqual({ role: 'user', content: 'Hi' });
    });

    it('should handle image attachments in getCompletion', async () => {
      const openai = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'I see an image' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 }
      });
      (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const provider = createAIProvider('openai', 'test-key');
      await provider.getCompletion({
        messages: [
          {
            role: 'user',
            content: 'What is this?',
            timestamp: Date.now(),
            attachments: [
              {
                id: 'img1',
                type: 'image',
                url: 'https://example.com/image.png',
                filename: 'photo.png',
                mimeType: 'image/png',
                size: 1000
              }
            ]
          }
        ],
        model: 'gpt-4o'
      });

      const calls = mockCreate.mock.calls[0][0];
      expect(calls.messages[0].role).toBe('user');
      expect(calls.messages[0].content).toEqual([
        { type: 'text', text: 'What is this?' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
      ]);
    });

    it('should skip system role messages in getCompletion', async () => {
      const openai = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
      });
      (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const provider = createAIProvider('openai', 'test-key');
      await provider.getCompletion({
        messages: [
          { role: 'system', content: 'System msg in messages', timestamp: Date.now() },
          { role: 'user', content: 'Hello', timestamp: Date.now() }
        ],
        model: 'gpt-4o'
      });

      const calls = mockCreate.mock.calls[0][0];
      // System messages from messages array should be skipped
      expect(calls.messages).toHaveLength(1);
      expect(calls.messages[0]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should handle null content and usage in getCompletion response', async () => {
      const openai = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: null }, finish_reason: null }],
        usage: null
      });
      (openai.default as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const provider = createAIProvider('openai', 'test-key');
      const result = await provider.getCompletion({
        messages: [{ role: 'user', content: 'Test', timestamp: Date.now() }],
        model: 'gpt-4o'
      });

      expect(result.content).toBe('');
      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
      expect(result.usage.totalTokens).toBe(0);
      expect(result.finishReason).toBe('stop');
    });
  });
});
