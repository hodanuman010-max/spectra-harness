/**
 * Agent Skill Open Standard Validator (agentskills.io compliance)
 * Verifies that a skill directory and its SKILL.md satisfy the Open Standard specification.
 *
 * Checks:
 * - Proper YAML frontmatter delimiter (---)
 * - Required fields: 'name' (1-64 chars, lowercase a-z, 0-9, hyphens)
 * - Required fields: 'description' (non-empty, <= 1024 chars)
 * - Valid license field
 * - Markdown structure and progressive disclosure references
 */

import fs from 'node:fs';
import path from 'node:path';

export function parseYamlFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: null, body: content, raw: '' };
  }

  const raw = match[1];
  const body = content.slice(match[0].length);
  const frontmatter = {};

  const lines = raw.split(/\r?\n/);
  let currentKey = null;
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(listMatch[1].replace(/^["']|["']$/g, '').trim());
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let val = kvMatch[2].trim();
      currentKey = key;

      if (val === '') {
        // Might be beginning of array or object
        frontmatter[key] = [];
        inList = true;
      } else {
        inList = false;
        // Strip quotes
        val = val.replace(/^["']|["']$/g, '');
        if (val.startsWith('[') && val.endsWith(']')) {
          frontmatter[key] = val
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^["']|["']$/g, ''));
        } else {
          frontmatter[key] = val;
        }
      }
    }
  }

  return { frontmatter, body, raw };
}

export function validateSkill(skillPath) {
  const issues = [];
  const warnings = [];

  let filePath = skillPath;
  let skillDir = skillPath;

  if (fs.existsSync(skillPath) && fs.statSync(skillPath).isDirectory()) {
    filePath = path.join(skillPath, 'SKILL.md');
  } else {
    skillDir = path.dirname(skillPath);
  }

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      issues: [`SKILL.md not found at expected path: ${filePath}`],
      warnings: [],
      metadata: null
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseYamlFrontmatter(content);

  if (!frontmatter) {
    issues.push('Missing or malformed YAML frontmatter (must start and end with "---")');
    return { valid: false, issues, warnings, metadata: null };
  }

  // 1. Name validation
  if (!frontmatter.name) {
    issues.push('Missing required frontmatter field: "name"');
  } else {
    const name = frontmatter.name;
    if (typeof name !== 'string') {
      issues.push('"name" must be a string');
    } else if (name.length < 1 || name.length > 64) {
      issues.push(`"name" length must be between 1 and 64 characters (current: ${name.length})`);
    } else if (!/^[a-z0-9-]+$/.test(name)) {
      issues.push(`"name" must only contain lowercase alphanumeric characters and hyphens: "${name}"`);
    }
  }

  // 2. Description validation
  if (!frontmatter.description) {
    issues.push('Missing required frontmatter field: "description"');
  } else {
    const desc = frontmatter.description;
    if (typeof desc !== 'string') {
      issues.push('"description" must be a string');
    } else if (desc.trim().length === 0) {
      issues.push('"description" must not be empty');
    } else if (desc.length > 1024) {
      warnings.push(`"description" is recommended to be <= 1024 characters (current: ${desc.length})`);
    }
  }

  // 3. License validation
  if (!frontmatter.license) {
    warnings.push('Frontmatter is missing recommended "license" field');
  }

  // 4. Allowed tools validation
  if (frontmatter['allowed-tools'] && !Array.isArray(frontmatter['allowed-tools'])) {
    warnings.push('"allowed-tools" should be an array of tool identifiers');
  }

  // 5. Body validation
  if (!body || body.trim().length < 50) {
    warnings.push('Body content is very brief; progressive disclosure instructions recommended');
  }

  // 6. Progressive disclosure subdirectories check
  const scriptsDir = path.join(skillDir, 'scripts');
  const referencesDir = path.join(skillDir, 'references');
  const assetsDir = path.join(skillDir, 'assets');

  const structure = {
    hasScripts: fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory(),
    hasReferences: fs.existsSync(referencesDir) && fs.statSync(referencesDir).isDirectory(),
    hasAssets: fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory()
  };

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    metadata: frontmatter,
    structure,
    complianceScore: issues.length === 0 ? (warnings.length === 0 ? 100 : 90) : 0
  };
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('skill-validator.js')) {
  const target = process.argv[2] || 'skills/spectra-model-eval/SKILL.md';
  console.log(`\n🔍 Validating Agent Skill against Agent Skill Open Standard: ${target}\n`);
  const result = validateSkill(target);

  if (result.valid) {
    console.log('✅ COMPLIANT WITH AGENT SKILL OPEN STANDARD');
    console.log(`   Skill Name:  ${result.metadata.name}`);
    console.log(`   License:     ${result.metadata.license || 'N/A'}`);
    console.log(`   Compliance:  ${result.complianceScore}%`);
    console.log(`   Directories: scripts: ${result.structure.hasScripts ? '✓' : '✗'}, references: ${result.structure.hasReferences ? '✓' : '✗'}, assets: ${result.structure.hasAssets ? '✓' : '✗'}`);
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }
    process.exit(0);
  } else {
    console.error('❌ VALIDATION FAILED:');
    result.issues.forEach(i => console.error(`   - ${i}`));
    process.exit(1);
  }
}
