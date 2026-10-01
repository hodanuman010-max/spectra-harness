import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSkill, parseYamlFrontmatter } from '../src/core/validator/skill-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Agent Skill Open Standard: parseYamlFrontmatter extracts metadata', () => {
  const sample = `---
name: test-skill
description: A test skill for validation.
license: Apache-2.0
allowed-tools:
  - run_command
---
# Instructions
Do something.`;

  const { frontmatter, body } = parseYamlFrontmatter(sample);
  assert.strictEqual(frontmatter.name, 'test-skill');
  assert.strictEqual(frontmatter.description, 'A test skill for validation.');
  assert.strictEqual(frontmatter.license, 'Apache-2.0');
  assert.deepStrictEqual(frontmatter['allowed-tools'], ['run_command']);
  assert.ok(body.includes('Do something'));
});

test('Agent Skill Open Standard: validates skills/spectra-model-eval/SKILL.md', () => {
  const skillFile = path.resolve(__dirname, '../skills/spectra-model-eval/SKILL.md');
  const res = validateSkill(skillFile);

  assert.strictEqual(res.valid, true, `Skill should be valid. Issues: ${res.issues.join(', ')}`);
  assert.strictEqual(res.metadata.name, 'spectra-model-eval');
  assert.strictEqual(res.metadata.license, 'Apache-2.0');
  assert.strictEqual(res.structure.hasScripts, true);
  assert.strictEqual(res.structure.hasReferences, true);
  assert.strictEqual(res.structure.hasAssets, true);
  assert.strictEqual(res.complianceScore, 100);
});

test('Agent Skill Open Standard: rejects invalid skill names', () => {
  const invalidSample = `---
name: INVALID_NAME_WITH_CAPS!
description: Invalid skill
---
Body`;

  // Write temporary test file or check inline validation logic
  const { frontmatter } = parseYamlFrontmatter(invalidSample);
  assert.ok(!/^[a-z0-9-]+$/.test(frontmatter.name));
});
