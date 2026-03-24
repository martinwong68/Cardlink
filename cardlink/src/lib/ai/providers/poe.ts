import type { AIProvider, ChatRequest, ChatResponse } from "../types";

/**
 * POE (poe.com) AI provider — OpenAI-compatible endpoint.
 *
 * Uses the Poe OpenAI-compatible API at https://api.poe.com/v1.
 * Default model is "claude-haiku-4.5" — override via `model` in ChatRequest
 * or the `AI_POE_DEFAULT_BOT` env var.
 *
 * Docs: https://creator.poe.com/docs/accessing-other-bots-on-poe
 */
export class PoeProvider implements AIProvider {
  readonly name = "poe";
  private apiKey: string;
  private defaultBot: string;
  private baseUrl: string;

  constructor() {
    const key = process.env.AI_POE_API_KEY;
    if (!key) throw new Error("AI_POE_API_KEY is not set");
    this.apiKey = key;
    this.defaultBot = process.env.AI_POE_DEFAULT_BOT ?? "claude-haiku-4.5";
    this.baseUrl = "https://api.poe.com/v1";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.defaultBot;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Poe API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: Record<string, number>;
      model?: string;
    };

    return {
      content: json.choices[0]?.message?.content ?? "",
      meta: { provider: "poe", model: json.model ?? model, usage: json.usage },
    };
  }
}
