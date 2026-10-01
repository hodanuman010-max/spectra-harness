/**
 * Entropy & Uncertainty Inspector
 * Computes Shannon entropy, perplexity, and token-level uncertainty heatmaps.
 */

export class EntropyInspector {
  /**
   * Calculates Shannon entropy from an array of probabilities.
   * H(X) = - sum(p_i * log2(p_i))
   * @param {number[]} probabilities
   * @returns {number} Entropy in bits
   */
  static calculateShannonEntropy(probabilities) {
    if (!probabilities || probabilities.length === 0) return 0;

    // Normalize probabilities if sum != 1
    const sum = probabilities.reduce((acc, p) => acc + p, 0);
    if (sum === 0) return 0;

    let entropy = 0;
    for (const p of probabilities) {
      const normalizedP = p / sum;
      if (normalizedP > 1e-9) {
        entropy -= normalizedP * Math.log2(normalizedP);
      }
    }
    return Math.max(0, entropy);
  }

  /**
   * Computes perplexity from an array of token logprobs.
   * PPL = exp(- (1/N) * sum(log(p_i)))
   * @param {number[]} logprobs - Natural log or log2 probabilities
   * @param {boolean} isBase2 - True if logprobs are log2
   * @returns {number}
   */
  static calculatePerplexity(logprobs, isBase2 = false) {
    if (!logprobs || logprobs.length === 0) return 1.0;
    const factor = isBase2 ? Math.LN2 : 1.0;
    const avgNegativeLogProb = - (logprobs.reduce((sum, lp) => sum + (lp * factor), 0) / logprobs.length);
    return Math.exp(avgNegativeLogProb);
  }

  /**
   * Inspects and augments token generation output with uncertainty metadata.
   * @param {Array<{token: string, logprob?: number, topK?: Array<{token: string, prob: number}>, entropy?: number}>} tokens
   */
  static inspectTokens(tokens) {
    if (!tokens || tokens.length === 0) {
      return {
        tokens: [],
        meanEntropy: 0,
        maxEntropy: 0,
        entropyVariance: 0,
        perplexity: 1.0,
        highRiskTokenCount: 0,
        uncertaintyRatio: 0
      };
    }

    const processedTokens = [];
    const entropies = [];
    const logprobs = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let entropy = t.entropy;

      if (entropy === undefined) {
        if (t.topK && t.topK.length > 0) {
          const probs = t.topK.map(k => k.prob);
          entropy = this.calculateShannonEntropy(probs);
        } else if (t.logprob !== undefined) {
          // Approximate entropy from single logprob (two-state proxy)
          const p = Math.exp(t.logprob);
          entropy = this.calculateShannonEntropy([p, Math.max(0.001, 1 - p)]);
        } else {
          entropy = 0.5; // baseline heuristic
        }
      }

      entropies.push(entropy);
      const lp = t.logprob !== undefined ? t.logprob : -Math.log(Math.max(0.0001, 1 - (entropy / 4)));
      logprobs.push(lp);

      let riskCategory = 'low';
      if (entropy >= 2.3) {
        riskCategory = 'severe';
      } else if (entropy >= 1.6) {
        riskCategory = 'elevated';
      } else if (entropy >= 0.8) {
        riskCategory = 'moderate';
      }

      processedTokens.push({
        index: i,
        token: t.token,
        entropy: Number(entropy.toFixed(3)),
        logprob: Number(lp.toFixed(3)),
        riskCategory,
        topK: t.topK || []
      });
    }

    const meanEntropy = entropies.reduce((a, b) => a + b, 0) / entropies.length;
    const variance = entropies.reduce((acc, val) => acc + Math.pow(val - meanEntropy, 2), 0) / entropies.length;
    const maxEntropy = Math.max(...entropies);
    const highRiskTokens = processedTokens.filter(t => t.riskCategory === 'severe' || t.riskCategory === 'elevated');
    const perplexity = this.calculatePerplexity(logprobs);

    return {
      tokens: processedTokens,
      meanEntropy: Number(meanEntropy.toFixed(3)),
      maxEntropy: Number(maxEntropy.toFixed(3)),
      entropyVariance: Number(variance.toFixed(4)),
      perplexity: Number(perplexity.toFixed(2)),
      highRiskTokenCount: highRiskTokens.length,
      uncertaintyRatio: Number((highRiskTokens.length / tokens.length).toFixed(3))
    };
  }
}
