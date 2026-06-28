import axios from 'axios';
import { config, logger } from '../config';

/**
 * Gemini 2.5 Flash — multimodal understanding for incoming media.
 * Used to turn voice notes into text and to describe images so the
 * (cheaper, text-only) reply model can answer about them.
 *
 * Uses the Generative Language REST API directly (no extra SDK dependency).
 */
export class GeminiService {
  private get apiKey(): string | undefined {
    return config.ai.geminiApiKey;
  }

  private get endpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent`;
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Download a Meta-hosted media URL and return its bytes + mime type.
   */
  private async fetchMedia(
    url: string
  ): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024, // 25 MB safety cap
      });
      const mimeType =
        (res.headers['content-type'] as string)?.split(';')[0] ||
        'application/octet-stream';
      return { base64: Buffer.from(res.data).toString('base64'), mimeType };
    } catch (error: any) {
      logger.error('Failed to download media for Gemini', {
        url,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Send an inline media part + prompt to Gemini and return the text reply.
   */
  private async generate(
    media: { base64: string; mimeType: string },
    prompt: string
  ): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const res = await axios.post(
        this.endpoint,
        {
          contents: [
            {
              parts: [
                { inline_data: { mime_type: media.mimeType, data: media.base64 } },
                { text: prompt },
              ],
            },
          ],
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        }
      );

      const text: string | undefined =
        res.data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ')
          .trim();

      return text || null;
    } catch (error: any) {
      logger.error('Gemini generateContent failed', {
        error: error.response?.data || error.message,
      });
      return null;
    }
  }

  /**
   * Generate a support-agent reply with Gemini (text chat).
   * Used as the reply engine when no Anthropic key is configured.
   *
   * @param systemPrompt persona + knowledge base (the agent's instructions)
   * @param history prior turns (oldest first)
   * @param message the customer's latest (already-resolved) message
   */
  async generateChatReply(
    systemPrompt: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    message: string
  ): Promise<string | null> {
    if (!this.apiKey) return null;

    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const res = await axios.post(
        this.endpoint,
        {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        }
      );

      const text: string | undefined = res.data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join('')
        .trim();

      return text || null;
    } catch (error: any) {
      logger.error('Gemini chat reply failed', {
        error: error.response?.data || error.message,
      });
      return null;
    }
  }

  /**
   * Write a polished agent persona (system prompt) from the business details
   * the user picked during onboarding. One-time call at agent creation.
   */
  async generatePersona(input: {
    name: string;
    businessType?: string | null;
    tone: string;
    greeting?: string | null;
    knowledge?: string | null;
  }): Promise<string | null> {
    if (!this.apiKey) return null;

    const brief = [
      `Agent name: ${input.name}`,
      input.businessType ? `Business: ${input.businessType}` : null,
      `Tone: ${input.tone}`,
      input.greeting ? `Preferred greeting: ${input.greeting}` : null,
      input.knowledge?.trim()
        ? `Knowledge sample:\n${input.knowledge.trim().slice(0, 2000)}`
        : 'No knowledge provided yet.',
    ]
      .filter(Boolean)
      .join('\n');

    const instruction =
      'You write system prompts for customer-support chat agents that run on ' +
      'Facebook and Instagram for businesses in Egypt. Given the brief, write a ' +
      'concise, production-ready persona (6-12 short instruction lines) describing ' +
      'who the agent is, its tone, how it greets, and how it handles customers. ' +
      'Write the persona in English. Do NOT include pricing or policy facts (those ' +
      'live in a separate knowledge base). Do NOT add headings, markdown, or quotes — ' +
      'output only the persona instructions, one per line.';

    try {
      const res = await axios.post(
        this.endpoint,
        {
          system_instruction: { parts: [{ text: instruction }] },
          contents: [{ role: 'user', parts: [{ text: brief }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        }
      );
      const text: string | undefined = res.data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join('')
        .trim();
      return text || null;
    } catch (error: any) {
      logger.error('Gemini persona generation failed', {
        error: error.response?.data || error.message,
      });
      return null;
    }
  }

  /**
   * Transcribe a voice note. Returns the transcription text, or null on failure.
   */
  async transcribeAudio(url: string): Promise<string | null> {
    if (!this.isConfigured) return null;
    const media = await this.fetchMedia(url);
    if (!media) return null;
    return this.generate(
      media,
      'Transcribe this voice message verbatim. Keep the original language ' +
        '(Arabic or English). Return ONLY the transcription text, with no extra commentary.'
    );
  }

  /**
   * Describe an image for the support agent. Returns a short description, or null.
   */
  async describeImage(url: string): Promise<string | null> {
    if (!this.isConfigured) return null;
    const media = await this.fetchMedia(url);
    if (!media) return null;
    return this.generate(
      media,
      'A customer sent this image to a business. In 1-2 sentences, describe what ' +
        'it shows and any visible text, product, or order/screenshot details that ' +
        'would help a support agent respond. Reply in the same language cues you see.'
    );
  }
}

export const geminiService = new GeminiService();
export default geminiService;
