import type { AIProvider, ChatRequest, ChatResponse } from "../types";

/**
 * GitHub Copilot AI provider — OpenAI-compatible endpoint.
 *
 * Uses the Copilot API at https://api.githubcopilot.com.
 * Default model is "gpt-4o" — override via `model` in ChatRequest
 * or the `AI_COPILOT_DEFAULT_MODEL` env var.
 *
 * Requires a GitHub token with Copilot access set in `GITHUB_TOKEN`.
 */
export class CopilotProvider implements AIProvider {
  readonly name = "copilot";
  private token: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is not set");
    this.token = token;
    this.defaultModel = process.env.AI_COPILOT_DEFAULT_MODEL ?? "gpt-4o";
    this.baseUrl = "https://api.githubcopilot.com";
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const model = req.model ?? this.defaultModel;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
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
      throw new Error(`Copilot API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: Record<string, number>;
      model?: string;
    };

    const content = json.choices?.[0]?.message?.content;
    if (content == null) {
      throw new Error("Copilot API returned no content in response");
    }

    return {
      content,
      meta: {
        provider: "copilot",
        model: json.model ?? model,
        usage: json.usage,
      },
    };
  }
}
