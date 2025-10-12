/**
 * Ollama translation provider
 *
 * Uses local Ollama instance for privacy-friendly translations
 * Default: http://localhost:11434
 */

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

export interface TranslationRequest {
  text: string;
  sourceLang?: string;
  targetLang: string;
  formality?: 'casual' | 'informal' | 'neutral' | 'polite' | 'formal' | 'honorific';
  context?: string;
}

export class OllamaProvider {
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: config.model || process.env.OLLAMA_MODEL || 'llama3.2',
      temperature: config.temperature ?? parseFloat(process.env.OLLAMA_TEMPERATURE || '0.3')
    };
  }

  /**
   * Translate a single text string
   */
  async translate(request: TranslationRequest): Promise<string> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          temperature: this.config.temperature,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.extractTranslation(data.response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch failed')) {
        throw new Error(`Failed to connect to Ollama at ${this.config.baseUrl}. Is Ollama running?`);
      }
      throw error;
    }
  }

  /**
   * Translate multiple strings in batch (more efficient)
   */
  async translateBatch(texts: string[], request: Omit<TranslationRequest, 'text'>): Promise<string[]> {
    const prompt = this.buildBatchPrompt(texts, request);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          temperature: this.config.temperature,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.extractBatchTranslations(data.response, texts.length);
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch failed')) {
        throw new Error(`Failed to connect to Ollama at ${this.config.baseUrl}. Is Ollama running?`);
      }
      throw error;
    }
  }

  /**
   * Build translation prompt with formality instructions
   */
  private buildPrompt(request: TranslationRequest): string {
    const { text, sourceLang, targetLang, formality, context } = request;

    let prompt = `Translate the following text to ${targetLang}`;

    if (sourceLang) {
      prompt += ` (from ${sourceLang})`;
    }

    if (formality) {
      prompt += `\n\nFormality level: ${formality}`;
      prompt += this.getFormalityGuidance(targetLang, formality);
    }

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += `\n\nIMPORTANT: Return ONLY the translated text, no explanations or additional commentary.`;
    prompt += `\n\nText to translate:\n${text}`;

    return prompt;
  }

  /**
   * Build batch translation prompt
   */
  private buildBatchPrompt(texts: string[], request: Omit<TranslationRequest, 'text'>): string {
    const { sourceLang, targetLang, formality, context } = request;

    let prompt = `Translate the following numbered list of texts to ${targetLang}`;

    if (sourceLang) {
      prompt += ` (from ${sourceLang})`;
    }

    if (formality) {
      prompt += `\n\nFormality level: ${formality}`;
      prompt += this.getFormalityGuidance(targetLang, formality);
    }

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += `\n\nIMPORTANT: Return ONLY the numbered translations, one per line, no explanations.`;
    prompt += `\nFormat: 1. <translation>\\n2. <translation>\\n...`;
    prompt += `\n\nTexts to translate:`;

    texts.forEach((text, i) => {
      prompt += `\n${i + 1}. ${text}`;
    });

    return prompt;
  }

  /**
   * Language-specific formality guidance
   */
  private getFormalityGuidance(targetLang: string, formality: string): string {
    const guidance: Record<string, Record<string, string>> = {
      ja: {
        casual: ' (Use casual form: だ/である)',
        polite: ' (Use polite form: です/ます - keigo)',
        formal: ' (Use respectful form: でございます)',
        honorific: ' (Use honorific form: 尊敬語/謙譲語)'
      },
      ko: {
        casual: ' (Use 반말 - banmal)',
        polite: ' (Use 존댓말 - jondaemal)',
        formal: ' (Use formal 존댓말)',
        honorific: ' (Use highest honorific form)'
      },
      de: {
        casual: ' (Use "du" form)',
        formal: ' (Use "Sie" form)'
      },
      es: {
        casual: ' (Use "tú" form)',
        formal: ' (Use "usted" form)'
      },
      fr: {
        casual: ' (Use "tu" form)',
        formal: ' (Use "vous" form)'
      }
    };

    return guidance[targetLang]?.[formality] || '';
  }

  /**
   * Extract clean translation from LLM response
   */
  private extractTranslation(response: string): string {
    // Remove common prefixes LLMs add
    let cleaned = response.trim();

    // Remove "Here is the translation:" etc
    cleaned = cleaned.replace(/^(here is the translation|translation|translated text|result):?\s*/i, '');

    // Remove quotes if entire response is quoted
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }

    return cleaned.trim();
  }

  /**
   * Extract batch translations from numbered list
   */
  private extractBatchTranslations(response: string, expectedCount: number): string[] {
    const lines = response.trim().split('\n');
    const translations: string[] = [];

    for (const line of lines) {
      // Match "1. translation" or "1) translation" or "1 translation"
      const match = line.match(/^\s*\d+[.)]\s*(.+)$/);
      if (match) {
        translations.push(this.extractTranslation(match[1]));
      }
    }

    // Fallback: if numbering didn't work, split by lines
    if (translations.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} translations, got ${translations.length}. Falling back to line splitting.`);
      return lines
        .filter(l => l.trim())
        .slice(0, expectedCount)
        .map(l => this.extractTranslation(l));
    }

    return translations;
  }

  /**
   * Check if Ollama is running and model is available
   */
  async checkHealth(): Promise<{ running: boolean; modelAvailable: boolean; error?: string }> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        return { running: false, modelAvailable: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const modelAvailable = data.models?.some((m: any) => m.name.includes(this.config.model));

      return { running: true, modelAvailable };
    } catch (error) {
      return {
        running: false,
        modelAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
