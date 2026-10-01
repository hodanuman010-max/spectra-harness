import test from 'node:test';
import assert from 'node:assert';
import { EntropyInspector } from '../src/core/metrics/entropy-inspector.js';

test('EntropyInspector: calculateShannonEntropy with deterministic distribution', () => {
  // If probability is 1.0, entropy should be exactly 0
  const h = EntropyInspector.calculateShannonEntropy([1.0]);
  assert.strictEqual(h, 0);
});

test('EntropyInspector: calculateShannonEntropy with fair coin (50/50)', () => {
  // If two outcomes each have probability 0.5, entropy should be exactly 1.0 bit
  const h = EntropyInspector.calculateShannonEntropy([0.5, 0.5]);
  assert.ok(Math.abs(h - 1.0) < 1e-6, `Expected ~1.0, got ${h}`);
});

test('EntropyInspector: calculatePerplexity calculation', () => {
  // logprob corresponding to p = 0.5: ln(0.5) ~ -0.693147
  const logprobs = [Math.log(0.5), Math.log(0.5)];
  const ppl = EntropyInspector.calculatePerplexity(logprobs);
  assert.ok(Math.abs(ppl - 2.0) < 0.05, `Expected PPL ~2.0, got ${ppl}`);
});

test('EntropyInspector: inspectTokens returns highRisk categorization', () => {
  const tokens = [
    { token: 'Safe', entropy: 0.3 },
    { token: 'Uncertain', entropy: 2.8 }
  ];
  const inspected = EntropyInspector.inspectTokens(tokens);
  assert.strictEqual(inspected.tokens.length, 2);
  assert.strictEqual(inspected.tokens[0].riskCategory, 'low');
  assert.strictEqual(inspected.tokens[1].riskCategory, 'severe');
  assert.strictEqual(inspected.highRiskTokenCount, 1);
});
