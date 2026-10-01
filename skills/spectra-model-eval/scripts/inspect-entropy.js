#!/usr/bin/env node
/**
 * Agent Skill Script: inspect-entropy.js
 * Analyzes token-level Shannon entropy, perplexity, and hallucination risk
 * on any input prompt using the SpectraHarness engine.
 */

import { SpectraHarness } from '../../../src/core/harness.js';
import { EntropyInspector } from '../../../src/core/metrics/entropy-inspector.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = 'Explain how to securely configure an open-weight model.';
  let model = 'HuggingFaceTB/SmolLM2-135M-Instruct';
  let engine = 'mock';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
    if (args[i] === '--model' && args[i + 1]) model = args[++i];
    if (args[i] === '--engine' && args[i + 1]) engine = args[++i];
  }
  return { prompt, model, engine };
}

async function main() {
  const { prompt, model, engine } = parseArgs();
  console.log(`\n🔍 Inspecting Token Entropy for Model: ${model}\n`);
  console.log(`Prompt: "${prompt}"\n`);

  const harness = new SpectraHarness({ engine, modelId: model });
  const raw = await harness.engine.generate(prompt);
  const inspection = EntropyInspector.inspectTokens(raw.tokens);

  console.log('--- GENERATED RESPONSE ---');
  console.log(raw.text);
  console.log('--------------------------\n');

  console.log('📊 UNCERTAINTY TELEMETRY:');
  console.log(`- Mean Token Entropy:    ${inspection.meanEntropy} bits`);
  console.log(`- Max Entropy Spike:     ${inspection.maxEntropy} bits`);
  console.log(`- Entropy Variance:      ${inspection.entropyVariance}`);
  console.log(`- Perplexity:            ${inspection.perplexity}`);
  console.log(`- High Risk Tokens:      ${inspection.highRiskTokenCount} / ${inspection.tokens.length} (${(inspection.uncertaintyRatio * 100).toFixed(1)}%)`);

  console.log('\n🔤 TOKEN-BY-TOKEN HEATMAP BREAKDOWN:');
  for (const t of inspection.tokens.slice(0, 25)) {
    const riskBadge = t.riskCategory === 'severe' ? '🔴 SEVERE' :
                      t.riskCategory === 'elevated' ? '🟠 ELEVATED' :
                      t.riskCategory === 'moderate' ? '🟡 MODERATE' : '🟢 LOW';
    console.log(`  [${riskBadge.padEnd(11)}] "${t.token.padEnd(14)}" | H: ${t.entropy.toString().padEnd(5)} bits | logp: ${t.logprob}`);
  }
  if (inspection.tokens.length > 25) {
    console.log(`  ... and ${inspection.tokens.length - 25} more tokens.`);
  }
}

main().catch(err => {
  console.error('[Entropy Inspector Error]:', err);
  process.exit(1);
});
