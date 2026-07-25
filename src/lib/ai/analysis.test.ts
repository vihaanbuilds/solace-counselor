import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLiveAnalysis, getSessionSummary, parseSummaryResponse } from './analysis';
import * as webllmEngine from './webllmEngine';
import { LIVE_ANALYSIS_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from './systemPrompt';

describe('analysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLiveAnalysis', () => {
    it('returns unavailable when the engine is not ready', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('loading');
      const result = await getLiveAnalysis('Some notes here');
      expect(result).toEqual({ text: '', available: false });
    });

    it('returns unavailable for blank notes even if the engine is ready', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
      const generateReplySpy = vi.spyOn(webllmEngine, 'generateReply');
      const result = await getLiveAnalysis('   ');
      expect(result).toEqual({ text: '', available: false });
      expect(generateReplySpy).not.toHaveBeenCalled();
    });

    it('calls the AI with the live-analysis system prompt and the notes', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
      const generateReplySpy = vi
        .spyOn(webllmEngine, 'generateReply')
        .mockResolvedValue('Themes: ...\nQuestions: ...');

      const result = await getLiveAnalysis('Student mentioned feeling left out at lunch.');

      expect(result).toEqual({ text: 'Themes: ...\nQuestions: ...', available: true });
      expect(generateReplySpy).toHaveBeenCalledWith([
        { role: 'system', content: LIVE_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: 'Student mentioned feeling left out at lunch.' },
      ]);
    });

    it('gracefully returns unavailable if the AI call throws', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
      vi.spyOn(webllmEngine, 'generateReply').mockRejectedValue(new Error('engine crashed'));

      const result = await getLiveAnalysis('Some notes.');

      expect(result).toEqual({ text: '', available: false });
    });
  });

  describe('parseSummaryResponse', () => {
    it('splits the summary paragraph from a trailing Themes line', () => {
      const raw =
        'The student discussed feeling excluded by friends.\nThemes: social exclusion, self-esteem';
      expect(parseSummaryResponse(raw)).toEqual({
        summary: 'The student discussed feeling excluded by friends.',
        themes: ['social exclusion', 'self-esteem'],
      });
    });

    it('is case-insensitive about the "Themes:" marker', () => {
      const raw = 'Summary text.\nTHEMES: anxiety';
      expect(parseSummaryResponse(raw)).toEqual({
        summary: 'Summary text.',
        themes: ['anxiety'],
      });
    });

    it('returns the whole text as the summary with no themes when there is no Themes line', () => {
      const raw = 'Just a plain summary with no themes line at all.';
      expect(parseSummaryResponse(raw)).toEqual({
        summary: raw,
        themes: [],
      });
    });
  });

  describe('getSessionSummary', () => {
    it('calls the AI with the summary system prompt and parses out themes', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
      const generateReplySpy = vi
        .spyOn(webllmEngine, 'generateReply')
        .mockResolvedValue('The student discussed friendship troubles.\nThemes: friendship, loneliness');

      const result = await getSessionSummary('Full session notes.');

      expect(result).toEqual({
        summary: 'The student discussed friendship troubles.',
        themes: ['friendship', 'loneliness'],
        available: true,
      });
      expect(generateReplySpy).toHaveBeenCalledWith([
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: 'Full session notes.' },
      ]);
    });

    it('gracefully returns unavailable if the AI call throws', async () => {
      vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
      vi.spyOn(webllmEngine, 'generateReply').mockRejectedValue(new Error('engine crashed'));

      const result = await getSessionSummary('Some notes.');

      expect(result).toEqual({ summary: '', themes: [], available: false });
    });
  });
});
