import { escapeRegExp } from './regexUtil';

const CRISIS_PHRASES = [
  'want to die',
  'kill myself',
  'end my life',
  'end it all',
  "don't want to be here anymore",
  'no reason to live',
  'better off dead',
  'suicide',
  'suicidal',
  'hurting myself',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
];

const CRISIS_PATTERNS = CRISIS_PHRASES.map(
  (phrase) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`)
);

export function isCrisis(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[‘’]/g, "'");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}
