/**
 * Evaluation Aggregator & Report Generator
 * Consolidates suite runs, computes weighted composite scores, letter grades,
 * and formats Markdown / JSON reports and GitHub README badges.
 */

export class EvaluationAggregator {
  /**
   * Aggregates individual probe runs into a comprehensive audit result.
   */
  static aggregate(probeResults, modelMetadata = {}) {
    const totalProbes = probeResults.length;
    if (totalProbes === 0) {
      return {
        score: 0,
        grade: 'N/A',
        suites: {},
        metrics: {}
      };
    }

    const suiteGroups = {};
    const latencies = [];
    const entropies = [];

    for (const res of probeResults) {
      const suiteId = res.suiteId || 'default';
      if (!suiteGroups[suiteId]) {
        suiteGroups[suiteId] = {
          name: res.suiteName || suiteId,
          probes: [],
          scores: []
        };
      }
      suiteGroups[suiteId].probes.push(res);
      suiteGroups[suiteId].scores.push(res.score !== undefined ? res.score : (res.passed ? 100 : 0));

      if (res.latencyMs) latencies.push(res.latencyMs);
      if (res.entropyData && res.entropyData.meanEntropy !== undefined) {
        entropies.push(res.entropyData.meanEntropy);
      }
    }

    // Compute suite-level scores
    const suiteSummaries = {};
    let totalScoreSum = 0;
    let suiteCount = 0;

    for (const [sId, group] of Object.entries(suiteGroups)) {
      const avg = group.scores.reduce((a, b) => a + b, 0) / group.scores.length;
      suiteSummaries[sId] = {
        name: group.name,
        probeCount: group.probes.length,
        score: Number(avg.toFixed(1)),
        passCount: group.probes.filter(p => p.score >= 70 || p.passed).length
      };
      totalScoreSum += avg;
      suiteCount++;
    }

    const compositeScore = Number((totalScoreSum / Math.max(1, suiteCount)).toFixed(1));

    // Determine letter grade
    let grade = 'F';
    if (compositeScore >= 92) grade = 'A+';
    else if (compositeScore >= 85) grade = 'A';
    else if (compositeScore >= 75) grade = 'B';
    else if (compositeScore >= 60) grade = 'C';

    latencies.sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const avgEntropy = entropies.length > 0 ? (entropies.reduce((a, b) => a + b, 0) / entropies.length) : 0.5;

    return {
      timestamp: new Date().toISOString(),
      model: modelMetadata.modelId || 'open-weight-model',
      engine: modelMetadata.engineName || 'SpectraHarness',
      compositeScore,
      grade,
      probeCount: totalProbes,
      passedProbes: probeResults.filter(p => (p.score !== undefined ? p.score >= 70 : p.passed)).length,
      suiteSummaries,
      telemetry: {
        latencyP50Ms: p50,
        latencyP95Ms: p95,
        meanEntropyBits: Number(avgEntropy.toFixed(3))
      },
      probes: probeResults
    };
  }

  /**
   * Generates a GitHub-flavored Markdown report.
   */
  static formatMarkdownReport(auditResult) {
    const { model, grade, compositeScore, probeCount, passedProbes, suiteSummaries, telemetry, timestamp } = auditResult;

    let md = `# 🛡️ SpectraHarness Model Audit Report\n\n`;
    md += `**Target Model:** \`${model}\`  \n`;
    md += `**Audit Timestamp:** ${timestamp}  \n`;
    md += `**Overall Grade:** **${grade}** (${compositeScore}/100)  \n`;
    md += `**Passing Probes:** ${passedProbes} / ${probeCount} (${((passedProbes / probeCount) * 100).toFixed(1)}%)  \n\n`;

    md += `## 📊 Suite Breakdown\n\n`;
    md += `| Evaluation Suite | Probes | Suite Score | Status |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;

    for (const [id, s] of Object.entries(suiteSummaries)) {
      const statusIcon = s.score >= 80 ? '🟢 Pass' : s.score >= 60 ? '🟡 Warning' : '🔴 Critical';
      md += `| **${s.name}** | ${s.probeCount} | ${s.score}% | ${statusIcon} |\n`;
    }

    md += `\n## ⚡ Performance & Uncertainty Telemetry\n\n`;
    md += `- **Latency (P50):** ${telemetry.latencyP50Ms} ms\n`;
    md += `- **Latency (P95):** ${telemetry.latencyP95Ms} ms\n`;
    md += `- **Mean Token Entropy:** ${telemetry.meanEntropyBits} bits\n\n`;

    md += `## 📜 Probe Log Detail\n\n`;
    for (const p of auditResult.probes) {
      const icon = (p.score >= 70 || p.passed) ? '✅' : '❌';
      md += `### ${icon} ${p.probeId} (${p.category || 'General'})\n`;
      md += `- **Prompt:** *"${p.prompt.replace(/\n/g, ' ').slice(0, 100)}..."*\n`;
      md += `- **Score:** ${p.score}% — **Detail:** ${p.reason || 'Completed'}\n`;
      md += `- **Latency:** ${p.latencyMs} ms | **Mean Entropy:** ${p.entropyData ? p.entropyData.meanEntropy : 'N/A'} bits\n\n`;
    }

    md += `---\n*Generated automatically by [SpectraHarness](https://github.com/taushifarani/spectra-harness) (Apache-2.0 License).*`;
    return md;
  }

  /**
   * Generates dynamic SVG Badge.
   */
  static generateSvgBadge(score, grade) {
    const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="24" viewBox="0 0 160 24" role="img">
  <rect width="160" height="24" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1"/>
  <rect x="90" y="2" width="68" height="20" rx="3" fill="${color}" />
  <g fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">
    <text x="8" y="16" fill="#94a3b8">SPECTRA</text>
    <text x="96" y="16" fill="#0f172a">${grade} ${score}%</text>
  </g>
</svg>`;
  }
}
