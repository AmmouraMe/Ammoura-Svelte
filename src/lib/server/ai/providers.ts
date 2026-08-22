/**
 * AI Provider abstraction layer
 * Provides a unified interface for different AI providers (OpenAI, Anthropic, Grok)
 */

import type { AIProvider, AIModel, AIChatMessage } from '$lib/types/ai-chat';

export interface AIStreamChunk {
  content: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AICompletionRequest {
  messages: AIChatMessage[];
  model: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  images?: string[]; // Base64 encoded images for vision models
}

export interface AICompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface AIProviderInterface {
  /**
   * Stream a completion from the AI provider
   */
  streamCompletion(request: AICompletionRequest): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Get a non-streaming completion from the AI provider
   */
  getCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;

  /**
   * Check if the provider supports vision (image analysis)
   */
  supportsVision(model: AIModel): boolean;

  /**
   * Get the provider name
   */
  getProviderName(): AIProvider;
}

/**
 * Factory function to create AI provider instances
 */
export function createAIProvider(provider: AIProvider, apiKey: string): AIProviderInterface {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'grok':
      return new OpenAIProvider(apiKey, 'grok', 'https://api.x.ai/v1');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider implements AIProviderInterface {
  private apiKey: string;
  private providerName: 'openai' | 'grok';
  private baseURL?: string;

  constructor(apiKey: string, providerName: 'openai' | 'grok' = 'openai', baseURL?: string) {
    this.apiKey = apiKey;
    this.providerName = providerName;
    this.baseURL = baseURL;
  }

  getProviderName(): AIProvider {
    return this.providerName;
  }

  supportsVision(model: AIModel): boolean {
    return this.providerName === 'openai' && (model === 'gpt-4o' || model === 'gpt-4o-mini');
  }

  async *streamCompletion(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI(
      this.baseURL ? { apiKey: this.apiKey, baseURL: this.baseURL } : { apiKey: this.apiKey }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    // Add system prompt if provided
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    // Convert messages
    for (const msg of request.messages) {
      if (msg.role === 'system') continue; // Skip system messages in history

      // If this is a user message with images, create multimodal content
      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          { type: 'text', text: msg.content }
        ];

        // Add images
        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            // OpenAI supports both data URIs and public URLs
            // Pass the URL as-is if it's a data URI or starts with http/https
            content.push({
              type: 'image_url',
              image_url: {
                url: attachment.url
              }
            });
          }
        }

        messages.push({
          role: msg.role,
          content
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    try {
      const stream = await openai.chat.completions.create({
        model: request.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
        stream_options: { include_usage: true }
      });

      let usageData: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;
      let finishReasonData: AIStreamChunk['finishReason'] | undefined;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        // Check for usage information in any chunk
        if (chunk.usage) {
          usageData = {
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0
          };
        }

        if (delta?.content) {
          yield {
            content: delta.content,
            done: false
          };
        }

        // Store finish reason but don't send done yet - wait for usage
        if (finishReason) {
          finishReasonData = finishReason as AIStreamChunk['finishReason'];
        }
      }

      // After stream ends, send final chunk with usage data
      if (finishReasonData) {
        yield {
          content: '',
          done: true,
          finishReason: finishReasonData,
          usage: usageData
        };
      }
    } catch (err) {
      const providerLabel = this.providerName === 'grok' ? 'Grok' : 'OpenAI';
      console.error(`${providerLabel} API error:`, err);
      if (err instanceof Error) {
        throw new Error(`${providerLabel} API error: ${err.message}`);
      }
      throw err;
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI(
      this.baseURL ? { apiKey: this.apiKey, baseURL: this.baseURL } : { apiKey: this.apiKey }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    for (const msg of request.messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          { type: 'text', text: msg.content }
        ];

        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            // OpenAI supports both data URIs and public URLs
            content.push({
              type: 'image_url',
              image_url: {
                url: attachment.url
              }
            });
          }
        }

        messages.push({
          role: msg.role,
          content
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      finishReason: response.choices[0]?.finish_reason || 'stop'
    };
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider implements AIProviderInterface {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getProviderName(): AIProvider {
    return 'anthropic';
  }

  supportsVision(model: AIModel): boolean {
    return (
      model === 'claude-sonnet-4-20250514' ||
      model === 'claude-3-5-sonnet-20241022' ||
      model === 'claude-3-5-haiku-20241022'
    );
  }

  async *streamCompletion(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: this.apiKey });

    type TextContent = {
      type: 'text';
      text: string;
    };

    type ImageContent = {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
      };
    };

    type MessageContent = string | Array<TextContent | ImageContent>;

    const messages: Array<{
      role: 'user' | 'assistant';
      content: MessageContent;
    }> = [];

    // Convert messages (Anthropic doesn't support system role in messages)
    for (const msg of request.messages) {
      if (msg.role === 'system') continue;

      const role: 'user' | 'assistant' = msg.role as 'user' | 'assistant';

      if (role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const content: Array<TextContent | ImageContent> = [{ type: 'text', text: msg.content }];

        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            // Anthropic expects base64 without data URI prefix
            let base64Data: string;
            if (attachment.url.startsWith('data:')) {
              base64Data = attachment.url.split(',')[1];
            } else {
              // If not a data URI, skip this attachment (should have been converted already)
              console.warn('Non-data URI image URL passed to Anthropic provider:', attachment.url);
              continue;
            }

            const mediaType = attachment.mimeType || 'image/jpeg';
            const validMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' =
              mediaType === 'image/png' || mediaType === 'image/gif' || mediaType === 'image/webp'
                ? mediaType
                : 'image/jpeg';

            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: validMediaType,
                data: base64Data
              }
            });
          }
        }

        messages.push({
          role,
          content
        });
      } else {
        messages.push({
          role,
          content: msg.content
        });
      }
    }

    const stream = await anthropic.messages.stream({
      model: request.model,
      messages,
      system: request.systemPrompt,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096
    });

    let finalMessage: { usage?: { input_tokens: number; output_tokens: number } } | null = null;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield {
          content: chunk.delta.text,
          done: false
        };
      }

      if (chunk.type === 'message_stop') {
        finalMessage = await stream.finalMessage();
        yield {
          content: '',
          done: true,
          finishReason: 'stop',
          usage: finalMessage?.usage
            ? {
                inputTokens: finalMessage.usage.input_tokens || 0,
                outputTokens: finalMessage.usage.output_tokens || 0,
                totalTokens:
                  (finalMessage.usage.input_tokens || 0) + (finalMessage.usage.output_tokens || 0)
              }
            : undefined
        };
      }
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: this.apiKey });

    type TextContent = {
      type: 'text';
      text: string;
    };

    type ImageContent = {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
      };
    };

    type MessageContent = string | Array<TextContent | ImageContent>;

    const messages: Array<{
      role: 'user' | 'assistant';
      content: MessageContent;
    }> = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') continue;

      const role: 'user' | 'assistant' = msg.role as 'user' | 'assistant';

      if (role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const content: Array<TextContent | ImageContent> = [{ type: 'text', text: msg.content }];

        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            let base64Data: string;
            if (attachment.url.startsWith('data:')) {
              base64Data = attachment.url.split(',')[1];
            } else {
              console.warn('Non-data URI image URL passed to Anthropic provider:', attachment.url);
              continue;
            }

            const mediaType = attachment.mimeType || 'image/jpeg';
            const validMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' =
              mediaType === 'image/png' || mediaType === 'image/gif' || mediaType === 'image/webp'
                ? mediaType
                : 'image/jpeg';

            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: validMediaType,
                data: base64Data
              }
            });
          }
        }

        messages.push({
          role,
          content
        });
      } else {
        messages.push({
          role,
          content: msg.content
        });
      }
    }

    const response = await anthropic.messages.create({
      model: request.model,
      messages,
      system: request.systemPrompt,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096
    });

    let content = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      finishReason: response.stop_reason || 'stop'
    };
  }
}
