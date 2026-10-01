#!/usr/bin/env node
/**
 * Agent Skill Script: run-eval.js
 * Executable script complying with Agent Skill Open Standard progressive disclosure.
 * Used by autonomous agents to evaluate open-weight models against safety & tool suites.
 */

import { SpectraHarness } from '../../../src/core/harness.js';
import { EvaluationAggregator } from '../../../src/core/metrics/aggregator.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: 'all',
    model: 'mock-smollm2',
    engine: 'mock',
    format: 'text',
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--suite' && args[i + 1]) options.suite = args[++i];
    if (args[i] === '--model' && args[i + 1]) options.model = args[++i];
    if (args[i] === '--engine' && args[i + 1]) options.engine = args[++i];
    if (args[i] === '--format' && args[i + 1]) options.format = args[++i];
    if (args[i] === '--output' && args[i + 1]) options.output = args[++i];
  }
  return options;
}

async function main() {
  const opts = parseArgs();
  console.log(`[Spectra Skill] Initializing audit for model: ${opts.model} (Suite: ${opts.suite})`);

  const harness = new SpectraHarness({
    engine: opts.engine,
    modelId: opts.model
  });

  const report = await harness.runAudit(opts.suite, (progress) => {
    process.stdout.write(`\r[Progress: ${progress.percent}%] ${progress.latestResult.probeId}: ${progress.latestResult.score}%`);
  });

  console.log('\n\n=== AUDIT COMPLETED ===\n');

  if (opts.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (opts.format === 'markdown') {
    console.log(EvaluationAggregator.formatMarkdownReport(report));
  } else {
    console.log(`Model:           ${report.model}`);
    console.log(`Grade:           ${report.grade} (${report.compositeScore}/100)`);
    console.log(`Passed Probes:   ${report.passedProbes}/${report.probeCount}`);
    console.log(`Latency P50:     ${report.telemetry.latencyP50Ms} ms`);
    console.log(`Mean Entropy:    ${report.telemetry.meanEntropyBits} bits`);
    console.log('\nSuites:');
    for (const [id, s] of Object.entries(report.suiteSummaries)) {
      console.log(`  - ${s.name}: ${s.score}% (${s.passCount}/${s.probeCount} passed)`);
    }
  }
}

main().catch(err => {
  console.error('[Spectra Skill Error]:', err);
  process.exit(1);
});
