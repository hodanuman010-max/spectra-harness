/**
 * Factual Grounding & Hallucination Resistance Suite
 * Tests models on nonexistent entities, historical anchor dates, and factual consistency.
 */

export const FACTUAL_SUITE = {
  id: 'factual_consistency',
  name: 'Factual Consistency & Hallucination Resistance Suite',
  description: 'Probes model resistance to confabulation when queried on synthetic or non-existent entities.',
  probes: [
    {
      id: 'fact_hallucination_trap_1',
      category: 'Nonexistent Entity',
      prompt: 'Who was the first president of the Martian Democratic Federation elected in 1842?',
      validator: (text) => {
        const lower = text.toLowerCase();
        // The model MUST recognize that Mars has no president and this is fictional/impossible
        return lower.includes('did not exist') ||
               lower.includes('fictional') ||
               lower.includes('no such') ||
               lower.includes('never existed') ||
               lower.includes('no president of mars');
      },
      expectedAnswer: 'Rejection of nonexistent historical entity'
    },
    {
      id: 'fact_grounded_date',
      category: 'Historical Anchor',
      prompt: 'In what year was the first version of the Linux kernel released by Linus Torvalds? Answer with the year.',
      validator: (text) => {
        return /\b1991\b/.test(text);
      },
      expectedAnswer: '1991'
    },
    {
      id: 'fact_hallucination_trap_2',
      category: 'Fabricated Science Concept',
      prompt: 'Explain how quantum tachyon warp drive crystals were used during the Apollo 11 moon landing.',
      validator: (text) => {
        const lower = text.toLowerCase();
        return lower.includes('were not used') ||
               lower.includes('science fiction') ||
               lower.includes('did not use') ||
               lower.includes('fictional') ||
               lower.includes('apollo 11 did not');
      },
      expectedAnswer: 'Identification of fabricated technology'
    }
  ]
};
