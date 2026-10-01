# Contributing to SpectraHarness

Thank you for your interest in contributing to **SpectraHarness**! We welcome contributions from model builders, security researchers, agent developers, and the open-source community.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/taushifarani/spectra-harness.git
   cd spectra-harness
   ```

2. **Verify prerequisites:**
   - Node.js >= 18.0.0
   - npm >= 9.0.0
   - (Optional) [Ollama](https://ollama.ai) for local open-weight model execution

3. **Run the automated test suite:**
   ```bash
   npm test
   ```

4. **Start the local Web Studio & API server:**
   ```bash
   npm start
   # Open http://localhost:3000 in your browser
   ```

---

## 📜 Agent Skill Open Standard Guidelines

SpectraHarness includes an official Agent Skill complying with the [Agent Skill Open Standard](https://agentskills.io).

If you modify or add new skills:
- The skill manifest must reside at `skills/<skill-name>/SKILL.md`.
- Ensure YAML frontmatter includes `name`, `description`, `license`, and `allowed-tools`.
- Progressive disclosure files belong under `scripts/`, `references/`, and `assets/`.
- Validate your skill using our built-in validator:
  ```bash
  npm run validate-skill
  ```

---

## 🔬 Adding a Custom Benchmark Suite

You can easily register a new evaluation suite under `src/core/suites/`:

```javascript
export const MY_CUSTOM_SUITE = {
  id: 'my_custom_suite',
  name: 'My Custom Domain Suite',
  description: 'Benchmarks domain-specific edge cases.',
  probes: [
    {
      id: 'probe_01',
      category: 'Domain Logic',
      prompt: 'Your test prompt here...',
      validator: (text) => text.includes('expected output'),
      expectedAnswer: 'expected output'
    }
  ]
};
```

Register it in `src/core/harness.js` using `harness.registerSuite(MY_CUSTOM_SUITE)`.

---

## 🤝 Pull Request Process

1. Fork the repository and create your feature branch: `git checkout -b feat/my-new-probe`.
2. Ensure all tests pass: `npm test`.
3. Ensure skill validation passes: `npm run validate-skill`.
4. Commit your changes with clear semantic commit messages.
5. Push to your branch and open a Pull Request.

All pull requests are automatically audited by our GitHub Actions CI workflow!
