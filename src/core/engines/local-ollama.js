/**
 * Local Ollama Engine Adapter
 * Connects to local or remote Ollama daemon (default: http://localhost:11434).
 */

import { BaseEngine } from './base-engine.js';

export class LocalOllamaEngine extends BaseEngine {
  constructor(config = {}) {
    super({
      name: 'LocalOllamaEngine',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      modelId: config.modelId || 'llama3.2:1b',
      temperature: config.temperature !== undefined ? config.temperature : 0.2,
      ...config
    });
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!res.ok) {
        return { ready: false, details: `Ollama returned HTTP ${res.status}` };
      }
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      return {
        ready: true,
        details: `Connected to Ollama. Installed models: ${models.join(', ') || 'None found'}`
      };
    } catch (err) {
      return { ready: false, details: `Cannot connect to Ollama at ${this.config.baseUrl}: ${err.message}` };
    }
  }

  async generate(prompt, options = {}) {
    const startTime = Date.now();
    const model = options.modelId || this.modelId;

    const body = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature !== undefined ? options.temperature : this.config.temperature
      }
    };

    const res = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed with HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const duration = Date.now() - startTime;
    const text = data.response || '';

    // Synthesize tokens if raw logprobs are not returned by standard endpoint
    const words = text.split(/(\s+|[.,!?;:()[\]{}"])/).filter(Boolean);
    const tokens = words.map(w => ({
      token: w,
      logprob: -0.5,
      entropy: 0.6,
      topK: [{ token: w, prob: 0.75 }]
    }));

    const tokensPerSecond = duration > 0 ? Number(((tokens.length / duration) * 1000).toFixed(1)) : 0;

    return {
      text,
      tokens,
      latencyMs: duration,
      tokensPerSecond,
      finishReason: 'stop',
      raw: data
    };
  }
}
