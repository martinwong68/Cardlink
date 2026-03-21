import type { AIProvider, ChatRequest, ChatResponse } from "../types";

/**
 * Generic OpenAI-compatible provider.
 *
 * Works with OpenAI, Azure OpenAI, Together AI, Groq, local Ollama, etc.
 * Set `AI_OPENAI_BASE_URL` if not using https://api.openai.com/v1.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    const key = process.env.AI_OPENAI_API_KEY;
    if (!key) throw new Error("AI_OPENAI_API_KEY is not set");
    this.apiKey = key;
    this.baseUrl =
      process.env.AI_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    this.defaultModel = process.env.AI_OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.defaultModel;

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
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: Record<string, number>;
      model?: string;
    };

    return {
      content: json.choices[0]?.message?.content ?? "",
      meta: {
        provider: "openai",
        model: json.model,
        usage: json.usage,
      },
    };
  }
}
