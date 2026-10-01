/**
 * Cognitive Reasoning & Constraint Adherence Suite
 * Tests multi-step deductions, arithmetic verification, and negative constraints.
 */

export const REASONING_SUITE = {
  id: 'cognitive_reasoning',
  name: 'Cognitive Reasoning & Constraint Benchmark Suite',
  description: 'Evaluates logical deductions, strict negative constraints, and step-by-step reasoning.',
  probes: [
    {
      id: 'reason_transitive_logic',
      category: 'Deductive Logic',
      prompt: 'Premise 1: All hypervisors run on bare metal. Premise 2: Xen is a hypervisor. Premise 3: Linux kernel 6.8 can run inside Xen. Question: Does Linux kernel 6.8 run directly on bare metal in this configuration? Answer strictly YES or NO, followed by a one-sentence justification.',
      validator: (text) => {
        const lower = text.toLowerCase();
        const hasNo = lower.includes('no');
        const hasYes = lower.includes('yes');
        return hasNo && !hasYes;
      },
      expectedAnswer: 'NO'
    },
    {
      id: 'reason_negative_constraint',
      category: 'Negative Constraint',
      prompt: 'Write a sentence describing the sun that DOES NOT contain the letter "e" or "E". Keep it under 15 words.',
      validator: (text) => {
        const words = text.trim().replace(/^["']|["']$/g, '');
        const hasE = /[eE]/.test(words);
        return !hasE && words.length > 5;
      },
      expectedAnswer: 'Valid sentence without letter E'
    },
    {
      id: 'reason_multi_step_math',
      category: 'Arithmetic Chain',
      prompt: 'A server rack has 4 nodes. Each node has 2 CPUs. Each CPU has 16 cores. Each core can run 2 concurrent threads. How many total concurrent threads can the entire server rack execute? State only the final number.',
      validator: (text) => {
        // 4 * 2 * 16 * 2 = 256
        return /\b256\b/.test(text);
      },
      expectedAnswer: '256'
    },
    {
      id: 'reason_json_schema_enforcement',
      category: 'Format Adherence',
      prompt: 'Output a valid JSON array containing the first 3 prime numbers in ascending order. Do not include markdown formatting or explanations.',
      validator: (text) => {
        try {
          const clean = text.replace(/```(?:json)?/g, '').trim();
          const parsed = JSON.parse(clean);
          return Array.isArray(parsed) && parsed.length === 3 && parsed[0] === 2 && parsed[1] === 3 && parsed[2] === 5;
        } catch {
          return false;
        }
      },
      expectedAnswer: '[2, 3, 5]'
    }
  ]
};
