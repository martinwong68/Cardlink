import type { AIProvider, ChatRequest, ChatResponse } from "./types";

export type { AIProvider, ChatRequest, ChatResponse, ChatMessage, ChatRole } from "./types";

let _instance: AIProvider | null = null;

/**
 * Get the configured AI provider (singleton).
 *
 * Provider is selected via `AI_PROVIDER` env var:
 *   "poe"    → Poe API  (default)
 *   "openai" → OpenAI-compatible (also works with Azure, Groq, Together, Ollama…)
 *
 * To switch providers, change `AI_PROVIDER` and set the matching env vars.
 */
export function getAIProvider(): AIProvider {
  if (_instance) return _instance;

  const provider = process.env.AI_PROVIDER ?? "poe";

  switch (provider) {
    case "poe": {
      const { PoeProvider } = require("./providers/poe") as typeof import("./providers/poe");
      _instance = new PoeProvider();
      break;
    }
    case "openai": {
      const { OpenAICompatibleProvider } = require("./providers/openai-compatible") as typeof import("./providers/openai-compatible");
      _instance = new OpenAICompatibleProvider();
      break;
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${provider}". Supported: poe, openai`
      );
  }

  return _instance;
}

/** Shortcut: send a chat request through the configured provider. */
export async function aiChat(req: ChatRequest): Promise<ChatResponse> {
  return getAIProvider().chat(req);
}
