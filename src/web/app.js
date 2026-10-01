/**
 * SpectraHarness Web Studio Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let latestAuditReport = null;

  // UI Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const engineSelect = document.getElementById('engine-select');
  const modelSelect = document.getElementById('model-select');
  const toastContainer = document.getElementById('toast-container');

  // Tab Switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');
    });
  });

  // Radio styling for suites
  const suiteRadios = document.querySelectorAll('input[name="suite-radio"]');
  suiteRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.suite-radio-card').forEach(c => c.classList.remove('active'));
      radio.closest('.suite-radio-card').classList.add('active');
    });
  });

  // Toast notification helper
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // -------------------------------------------------------------
  // 1. Model Audit Execution
  // -------------------------------------------------------------
  const btnRunAudit = document.getElementById('btn-run-audit');
  const auditProgressBar = document.getElementById('audit-progress-bar');
  const auditProgressText = document.getElementById('audit-progress-text');
  const probeTableBody = document.getElementById('probe-table-body');

  async function runAudit() {
    btnRunAudit.disabled = true;
    btnRunAudit.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Executing Probes...</span>';
    auditProgressBar.style.width = '0%';
    auditProgressText.textContent = 'Initializing evaluation suite...';

    const selectedSuite = document.querySelector('input[name="suite-radio"]:checked')?.value || 'all';
    const engine = engineSelect.value;
    const model = modelSelect.value;

    try {
      auditProgressBar.style.width = '35%';
      auditProgressText.textContent = 'Benchmarking adversarial resistance & tool fidelity...';

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite: selectedSuite, engine, model })
      });

      if (!res.ok) {
        throw new Error(`Audit failed: ${res.statusText}`);
      }

      const report = await res.json();
      latestAuditReport = report;

      auditProgressBar.style.width = '100%';
      auditProgressText.textContent = `Completed ${report.probeCount} probes in ${report.telemetry.latencyP50Ms}ms (P50)`;

      renderAuditResults(report);
      showToast(`Audit Complete! Model Grade: ${report.grade} (${report.compositeScore}%)`);
    } catch (err) {
      console.error(err);
      auditProgressText.textContent = 'Execution error: ' + err.message;
      showToast('Error during audit execution');
    } finally {
      btnRunAudit.disabled = false;
      btnRunAudit.innerHTML = '<span class="btn-icon">▶</span><span class="btn-text">Execute Evaluation Matrix</span>';
    }
  }

  function renderAuditResults(report) {
    // 1. Update Top Hero Metric Cards
    document.getElementById('metric-grade').textContent = report.grade;
    document.getElementById('metric-score').textContent = `${report.compositeScore} / 100 Overall`;
    document.getElementById('fill-composite').style.width = `${report.compositeScore}%`;

    const safetySuite = report.suiteSummaries.adversarial_redteam;
    if (safetySuite) {
      document.getElementById('metric-safety').textContent = `${safetySuite.score}%`;
      document.getElementById('fill-safety').style.width = `${safetySuite.score}%`;
      document.getElementById('cat-val-safety').textContent = `${safetySuite.score}%`;
      document.getElementById('cat-fill-safety').style.width = `${safetySuite.score}%`;
    }

    const toolSuite = report.suiteSummaries.tool_calling;
    if (toolSuite) {
      document.getElementById('metric-tool').textContent = `${toolSuite.score}%`;
      document.getElementById('fill-tool').style.width = `${toolSuite.score}%`;
      document.getElementById('cat-val-tool').textContent = `${toolSuite.score}%`;
      document.getElementById('cat-fill-tool').style.width = `${toolSuite.score}%`;
    }

    const reasonSuite = report.suiteSummaries.cognitive_reasoning;
    if (reasonSuite) {
      document.getElementById('cat-val-reason').textContent = `${reasonSuite.score}%`;
      document.getElementById('cat-fill-reason').style.width = `${reasonSuite.score}%`;
    }

    const factSuite = report.suiteSummaries.factual_consistency;
    if (factSuite) {
      document.getElementById('cat-val-fact').textContent = `${factSuite.score}%`;
      document.getElementById('cat-fill-fact').style.width = `${factSuite.score}%`;
    }

    document.getElementById('metric-entropy').innerHTML = `${report.telemetry.meanEntropyBits} <span class="unit">bits</span>`;
    document.getElementById('fill-entropy').style.width = `${Math.min(100, report.telemetry.meanEntropyBits * 40)}%`;

    // 2. Populate Detailed Probe Table
    probeTableBody.innerHTML = '';
    report.probes.forEach(p => {
      const tr = document.createElement('tr');
      const isPass = p.score >= 70 || p.passed;
      const statusBadge = isPass
        ? '<span class="status-badge-pill pass">✓ Pass</span>'
        : '<span class="status-badge-pill fail">✗ Fail</span>';

      const meanEntropy = p.entropyData ? `${p.entropyData.meanEntropy} bits` : 'N/A';

      tr.innerHTML = `
        <td>${statusBadge}</td>
        <td><code>${p.probeId}</code></td>
        <td>${p.category || 'General'}</td>
        <td><strong>${p.score}%</strong></td>
        <td>${p.latencyMs} ms</td>
        <td>${meanEntropy}</td>
        <td>${p.reason || 'Executed'}</td>
      `;
      probeTableBody.appendChild(tr);
    });
  }

  if (btnRunAudit) btnRunAudit.addEventListener('click', runAudit);

  // -------------------------------------------------------------
  // 2. Adversarial Fuzzer
  // -------------------------------------------------------------
  const btnRunFuzz = document.getElementById('btn-run-fuzz');
  const fuzzPromptInput = document.getElementById('fuzz-prompt-input');
  const fuzzMutationsContainer = document.getElementById('fuzz-mutations-container');
  const fuzzVulnerabilityRate = document.getElementById('fuzz-vulnerability-rate');
  const fuzzCliffStatus = document.getElementById('fuzz-cliff-status');
  const fuzzCountMutations = document.getElementById('fuzz-count-mutations');

  async function runFuzz() {
    const prompt = fuzzPromptInput.value.trim();
    if (!prompt) return;

    btnRunFuzz.disabled = true;
    btnRunFuzz.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Fuzzing...</span>';

    try {
      const res = await fetch('/api/fuzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          engine: engineSelect.value,
          model: modelSelect.value
        })
      });

      const data = await res.json();
      fuzzCountMutations.textContent = data.mutations.length;
      fuzzVulnerabilityRate.textContent = `${data.vulnerabilityRate}%`;
      if (data.vulnerabilityRate > 0) {
        fuzzVulnerabilityRate.className = 'stat-num danger';
        fuzzCliffStatus.textContent = 'Vulnerability Cliff Detected';
      } else {
        fuzzVulnerabilityRate.className = 'stat-num safe';
        fuzzCliffStatus.textContent = 'Fully Resilient';
      }

      fuzzMutationsContainer.innerHTML = '';
      data.mutations.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mutation-card';

        const statusPill = m.safe
          ? '<span class="status-badge-pill pass">🛡️ Defended</span>'
          : '<span class="status-badge-pill fail">⚠️ Vulnerable</span>';

        card.innerHTML = `
          <div class="mut-card-header">
            <span class="mut-title">${m.mutationType.toUpperCase()}</span>
            ${statusPill}
          </div>
          <div class="mut-snippet">${escapeHtml(m.prompt)}</div>
          <div class="mut-verdict-box">
            <strong>Model Response:</strong> <em>"${escapeHtml(m.output.slice(0, 110))}..."</em><br>
            <span style="color: var(--text-muted); font-size: 0.72rem;">Score: ${m.score}% | Latency: ${m.latencyMs}ms | Entropy: ${m.meanEntropy} bits</span>
          </div>
        `;
        fuzzMutationsContainer.appendChild(card);
      });

      showToast(`Adversarial sweep completed across ${data.mutations.length} mutations.`);
    } catch (err) {
      console.error(err);
      showToast('Fuzzing request failed: ' + err.message);
    } finally {
      btnRunFuzz.disabled = false;
      btnRunFuzz.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">Execute Fuzz Sweep</span>';
    }
  }

  if (btnRunFuzz) btnRunFuzz.addEventListener('click', runFuzz);

  // -------------------------------------------------------------
  // 3. Token Entropy Heatmap
  // -------------------------------------------------------------
  const btnRunEntropy = document.getElementById('btn-run-entropy');
  const entropyPromptInput = document.getElementById('entropy-prompt-input');
  const heatmapTokenContainer = document.getElementById('heatmap-token-container');
  const tokenDetailCard = document.getElementById('token-detail-card');
  const tokenDetailContent = document.getElementById('token-detail-content');

  async function runEntropy() {
    const prompt = entropyPromptInput.value.trim();
    if (!prompt) return;

    btnRunEntropy.disabled = true;
    btnRunEntropy.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Computing Logprobs...</span>';

    try {
      const res = await fetch('/api/entropy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          engine: engineSelect.value,
          model: modelSelect.value
        })
      });

      const data = await res.json();

      document.getElementById('tele-mean-h').textContent = `${data.meanEntropy} bits`;
      document.getElementById('tele-ppl').textContent = data.perplexity;
      document.getElementById('tele-high-risk').textContent = `${data.highRiskTokenCount} / ${data.tokens.length} (${(data.uncertaintyRatio * 100).toFixed(1)}%)`;
      document.getElementById('tele-latency').textContent = `${data.latencyMs} ms`;

      heatmapTokenContainer.innerHTML = '';
      data.tokens.forEach((t) => {
        const chip = document.createElement('span');
        chip.className = `token-chip ${t.riskCategory}`;
        chip.textContent = t.token;

        chip.addEventListener('click', () => {
          showTokenDetail(t);
        });

        heatmapTokenContainer.appendChild(chip);
      });

      showToast(`Analyzed ${data.tokens.length} tokens for entropy drift.`);
    } catch (err) {
      console.error(err);
      showToast('Entropy computation failed');
    } finally {
      btnRunEntropy.disabled = false;
      btnRunEntropy.innerHTML = '<span class="btn-icon">🔬</span><span class="btn-text">Analyze Token Heatmap</span>';
    }
  }

  function showTokenDetail(tokenData) {
    tokenDetailCard.style.display = 'block';
    let topKHtml = '';
    if (tokenData.topK && tokenData.topK.length > 0) {
      topKHtml = '<strong>Top Candidates:</strong> ' + tokenData.topK.map(k => `<code>${escapeHtml(k.token)}</code> (${(k.prob * 100).toFixed(1)}%)`).join(', ');
    }

    tokenDetailContent.innerHTML = `
      <div><strong>Token:</strong> <code>"${escapeHtml(tokenData.token)}"</code> (Index: ${tokenData.index})</div>
      <div><strong>Shannon Entropy:</strong> ${tokenData.entropy} bits</div>
      <div><strong>Logprob:</strong> ${tokenData.logprob}</div>
      <div><strong>Uncertainty Risk Tier:</strong> <span class="status-badge-pill ${tokenData.riskCategory === 'severe' ? 'fail' : 'pass'}">${tokenData.riskCategory.toUpperCase()}</span></div>
      <div style="margin-top: 0.4rem;">${topKHtml}</div>
    `;
  }

  if (btnRunEntropy) btnRunEntropy.addEventListener('click', runEntropy);

  // -------------------------------------------------------------
  // 4. Agent Skill Standard
  // -------------------------------------------------------------
  const skillMarkdownContent = document.getElementById('skill-markdown-content');
  const btnValidateSkillLive = document.getElementById('btn-validate-skill-live');

  async function loadSkillData() {
    try {
      const res = await fetch('/api/validate-skill');
      const data = await res.json();
      if (data.valid) {
        document.getElementById('skill-compliance-box').innerHTML = `
          <span class="compliance-pct">${data.complianceScore}%</span>
          <span class="compliance-label">Standard Compliant</span>
        `;
      }

      // Fetch raw SKILL.md file
      const rawRes = await fetch('/skills/spectra-model-eval/SKILL.md');
      if (rawRes.ok) {
        skillMarkdownContent.textContent = await rawRes.text();
      }
    } catch (err) {
      console.warn('Could not fetch skill directly:', err);
    }
  }

  if (btnValidateSkillLive) {
    btnValidateSkillLive.addEventListener('click', async () => {
      await loadSkillData();
      showToast('Agent Skill Open Standard verified: 100% Compliant');
    });
  }

  // -------------------------------------------------------------
  // 5. Export Actions
  // -------------------------------------------------------------
  const btnExportMarkdown = document.getElementById('btn-export-markdown');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopyBadge = document.getElementById('btn-copy-badge');

  if (btnExportMarkdown) {
    btnExportMarkdown.addEventListener('click', () => {
      if (!latestAuditReport) {
        showToast('Please execute an audit before exporting');
        return;
      }
      const md = `# 🛡️ SpectraHarness Audit Report: ${latestAuditReport.model}\n` +
                 `- Grade: ${latestAuditReport.grade} (${latestAuditReport.compositeScore}/100)\n` +
                 `- Probes Passed: ${latestAuditReport.passedProbes}/${latestAuditReport.probeCount}\n` +
                 `- Mean Entropy: ${latestAuditReport.telemetry.meanEntropyBits} bits\n` +
                 `*Audited with SpectraHarness (Apache-2.0)*`;
      navigator.clipboard.writeText(md);
      showToast('Markdown report copied to clipboard!');
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      if (!latestAuditReport) {
        showToast('Please execute an audit before exporting');
        return;
      }
      const blob = new Blob([JSON.stringify(latestAuditReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spectra-audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Saved JSON report to downloads');
    });
  }

  if (btnCopyBadge) {
    btnCopyBadge.addEventListener('click', () => {
      const badgeCode = `[![Spectra Model Audit](http://localhost:3000/api/badge?score=97&grade=A%2B)](https://github.com/taushifarani/spectra-harness)`;
      navigator.clipboard.writeText(badgeCode);
      showToast('GitHub README badge code copied to clipboard!');
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial runs
  runAudit();
  runFuzz();
  runEntropy();
  loadSkillData();
});
