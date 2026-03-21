import type { AIProvider, ChatRequest, ChatResponse } from "../types";

const POE_API_BASE = "https://api.poe.com/bot/";

/**
 * POE (poe.com) AI provider.
 *
 * Uses the Poe API with a server-side API key.
 * Default bot is "GPT-4o-Mini" — override via `model` in ChatRequest
 * or the `AI_POE_DEFAULT_BOT` env var.
 *
 * Docs: https://creator.poe.com/docs/accessing-other-bots-on-poe
 */
export class PoeProvider implements AIProvider {
  readonly name = "poe";
  private apiKey: string;
  private defaultBot: string;

  constructor() {
    const key = process.env.AI_POE_API_KEY;
    if (!key) throw new Error("AI_POE_API_KEY is not set");
    this.apiKey = key;
    this.defaultBot = process.env.AI_POE_DEFAULT_BOT ?? "GPT-4o-Mini";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const bot = req.model ?? this.defaultBot;

    const body = {
      query: req.messages,
      temperature: req.temperature ?? 0.7,
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
    };

    const res = await fetch(`${POE_API_BASE}${encodeURIComponent(bot)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Poe API error ${res.status}: ${text}`);
    }

    // Poe streams SSE by default — collect full response
    const text = await res.text();
    const content = this.parseSSE(text);

    return { content, meta: { provider: "poe", bot } };
  }

  /** Parse Server-Sent Events into a single concatenated text response. */
  private parseSSE(raw: string): string {
    const chunks: string[] = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6);
        if (payload === "[DONE]") break;
        try {
          const json = JSON.parse(payload) as { text?: string };
          if (json.text) chunks.push(json.text);
        } catch {
          // Non-JSON data line — append as-is
          chunks.push(payload);
        }
      }
    }
    return chunks.join("") || raw;
  }
}
