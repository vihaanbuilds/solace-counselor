import { describe, it, expect } from 'vitest';
import { isCrisis } from './crisisDetection';

describe('isCrisis', () => {
  it('flags direct statements of wanting to die', () => {
    expect(isCrisis('I want to die')).toBe(true);
  });

  it('flags self-harm language', () => {
    expect(isCrisis('sometimes I think about hurting myself')).toBe(true);
  });

  it('flags "suicide" mentions', () => {
    expect(isCrisis('I keep having thoughts about suicide')).toBe(true);
  });

  it('flags "suicidal" as well as "suicide"', () => {
    expect(isCrisis("I've been feeling suicidal lately")).toBe(true);
  });

  it('does not flag ordinary text', () => {
    expect(isCrisis('I love pizza and I had a good day')).toBe(false);
  });

  it('does not flag ordinary sadness without crisis language', () => {
    expect(isCrisis('I feel really sad and empty today')).toBe(false);
  });

  it('flags "hurt myself" as well as "hurting myself"', () => {
    expect(isCrisis('I want to hurt myself')).toBe(true);
  });

  it('flags crisis phrasing even with a curly apostrophe from mobile autocorrect', () => {
    expect(isCrisis('I don’t want to be here anymore')).toBe(true);
  });

  it('does not flag "self harm" when it spans an unrelated word boundary', () => {
    expect(isCrisis('I would never want to see myself harmed by anyone')).toBe(false);
  });

  it('does not flag unrelated words that happen to contain a lexicon fragment', () => {
    expect(isCrisis('The party had wonderful harmony and the music died down slowly')).toBe(false);
  });
});
