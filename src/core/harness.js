/**
 * SpectraHarness Core Orchestrator
 * Comprehensive evaluation, red-teaming, and token entropy analysis framework
 * for open-weight language models and autonomous agent pipelines.
 */

import { MockOpenWeightEngine } from './engines/mock-openweight.js';
import { LocalOllamaEngine } from './engines/local-ollama.js';
import { TransformersJsEngine } from './engines/browser-transformers.js';
import { ADVERSARIAL_SUITE } from './suites/adversarial-redteam.js';
import { TOOL_CALLING_SUITE } from './suites/tool-calling.js';
import { REASONING_SUITE } from './suites/cognitive-reasoning.js';
import { FACTUAL_SUITE } from './suites/factual-consistency.js';
import { EntropyInspector } from './metrics/entropy-inspector.js';
import { SafetyScorer } from './metrics/safety-scorer.js';
import { EvaluationAggregator } from './metrics/aggregator.js';
import { PromptMutator } from './fuzzer/prompt-mutator.js';

export class SpectraHarness {
  constructor(config = {}) {
    this.config = config;
    this.engine = this.resolveEngine(config.engine || 'mock', config);
    this.suites = {
      adversarial_redteam: ADVERSARIAL_SUITE,
      tool_calling: TOOL_CALLING_SUITE,
      cognitive_reasoning: REASONING_SUITE,
      factual_consistency: FACTUAL_SUITE
    };
  }

  resolveEngine(engineType, options) {
    if (typeof engineType === 'object') return engineType;

    switch (engineType.toLowerCase()) {
      case 'ollama':
        return new LocalOllamaEngine(options);
      case 'transformers':
      case 'transformers.js':
      case 'webgpu':
        return new TransformersJsEngine(options);
      case 'mock':
      case 'simulator':
      default:
        return new MockOpenWeightEngine(options);
    }
  }

  /**
   * Registers a custom benchmark suite.
   */
  registerSuite(suite) {
    if (!suite.id || !Array.isArray(suite.probes)) {
      throw new Error('Suite must have an "id" and an array of "probes"');
    }
    this.suites[suite.id] = suite;
  }

  /**
   * Evaluates a single probe.
   */
  async runProbe(suiteId, probe, options = {}) {
    const rawResult = await this.engine.generate(probe.prompt, options);
    const entropyData = EntropyInspector.inspectTokens(rawResult.tokens);

    let score = 0;
    let passed = false;
    let reason = '';

    if (suiteId === 'adversarial_redteam') {
      const evalRes = SafetyScorer.evaluateAdversarialResponse(rawResult.text, probe);
      score = evalRes.score;
      passed = evalRes.safe;
      reason = evalRes.reason;
    } else if (suiteId === 'tool_calling') {
      const evalRes = SafetyScorer.evaluateToolCall(rawResult.text, probe.schema || {});
      score = evalRes.score;
      passed = evalRes.schemaMatch;
      reason = evalRes.reason;
    } else if (probe.validator && typeof probe.validator === 'function') {
      passed = probe.validator(rawResult.text);
      score = passed ? 100 : 20;
      reason = passed ? `Satisfied expected assertion (${probe.expectedAnswer})` : `Failed assertion, expected: ${probe.expectedAnswer}`;
    } else {
      passed = true;
      score = 80;
      reason = 'Generated completion';
    }

    return {
      suiteId,
      probeId: probe.id,
      category: probe.category || 'Standard',
      prompt: probe.prompt,
      output: rawResult.text,
      score,
      passed,
      reason,
      latencyMs: rawResult.latencyMs,
      tokensPerSecond: rawResult.tokensPerSecond,
      entropyData
    };
  }

  /**
   * Executes one or all registered suites.
   * @param {string|string[]} targetSuites - 'all' or suite IDs
   * @param {function} onProgress - Optional callback for live progress streaming
   */
  async runAudit(targetSuites = 'all', onProgress = null) {
    const suitesToRun = [];

    if (targetSuites === 'all' || !targetSuites) {
      suitesToRun.push(...Object.values(this.suites));
    } else {
      const ids = Array.isArray(targetSuites) ? targetSuites : [targetSuites];
      for (const id of ids) {
        if (this.suites[id]) {
          suitesToRun.push(this.suites[id]);
        } else {
          console.warn(`[SpectraHarness] Suite "${id}" not found.`);
        }
      }
    }

    const totalProbesCount = suitesToRun.reduce((acc, s) => acc + s.probes.length, 0);
    let completedCount = 0;
    const probeResults = [];

    for (const suite of suitesToRun) {
      for (const probe of suite.probes) {
        const result = await this.runProbe(suite.id, probe);
        probeResults.push({
          ...result,
          suiteName: suite.name
        });
        completedCount++;

        if (onProgress && typeof onProgress === 'function') {
          onProgress({
            completed: completedCount,
            total: totalProbesCount,
            latestResult: result,
            percent: Math.round((completedCount / totalProbesCount) * 100)
          });
        }
      }
    }

    return EvaluationAggregator.aggregate(probeResults, {
      modelId: this.engine.modelId || 'open-weight-model',
      engineName: this.engine.name
    });
  }

  /**
   * Runs an adversarial fuzzing perturbation sweep on a single input prompt.
   */
  async runFuzzSweep(basePrompt, onProgress = null) {
    const mutations = PromptMutator.generateMutationMatrix(basePrompt);
    const results = [];

    for (let i = 0; i < mutations.length; i++) {
      const mut = mutations[i];
      const genResult = await this.engine.generate(mut.prompt);
      const evalRes = SafetyScorer.evaluateAdversarialResponse(genResult.text, { expectRefusal: true });
      const entropy = EntropyInspector.inspectTokens(genResult.tokens);

      const item = {
        mutationType: mut.mutationType,
        description: mut.description,
        prompt: mut.prompt,
        output: genResult.text,
        score: evalRes.score,
        safe: evalRes.safe,
        refused: evalRes.refused,
        reason: evalRes.reason,
        latencyMs: genResult.latencyMs,
        meanEntropy: entropy.meanEntropy
      };

      results.push(item);
      if (onProgress) {
        onProgress({ current: i + 1, total: mutations.length, item });
      }
    }

    return {
      basePrompt,
      mutations: results,
      vulnerabilityRate: Number(((results.filter(r => !r.safe).length / results.length) * 100).toFixed(1))
    };
  }
}
