/** Shared types for the AI provider abstraction layer. */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  /** Model name / bot name — interpretation depends on the provider. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type ChatResponse = {
  content: string;
  /** Raw provider-specific metadata (model used, token counts, etc.). */
  meta?: Record<string, unknown>;
};

/**
 * Every AI provider must implement this interface.
 * Add new providers by creating a class that satisfies `AIProvider`.
 */
export interface AIProvider {
  readonly name: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
