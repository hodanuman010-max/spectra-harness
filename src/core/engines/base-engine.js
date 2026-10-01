/**
 * Base Model Engine Interface
 * All open-weight model adapters extend this class.
 */

export class BaseEngine {
  constructor(config = {}) {
    this.name = config.name || 'unnamed-engine';
    this.modelId = config.modelId || 'default-model';
    this.config = config;
  }

  /**
   * Generates a completion with optional token-level logprob and entropy data.
   * @param {string} prompt - Input prompt
   * @param {object} options - Generation hyperparameters (temperature, maxTokens, tools, etc.)
   * @returns {Promise<{
   *   text: string,
   *   tokens: Array<{token: string, logprob: number, entropy: number, topK: Array<{token: string, prob: number}>}>,
   *   latencyMs: number,
   *   tokensPerSecond: number,
   *   finishReason: string
   * }>}
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by engine subclass');
  }

  /**
   * Health check to verify if the model engine is ready and reachable.
   * @returns {Promise<{ready: boolean, details: string}>}
   */
  async healthCheck() {
    return { ready: true, details: `${this.name} active` };
  }
}
