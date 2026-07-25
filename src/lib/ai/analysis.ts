import { generateReply, getEngineStatus, ChatMessage } from './webllmEngine';
import { LIVE_ANALYSIS_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from './systemPrompt';

export interface AnalysisResult {
  text: string;
  available: boolean;
}

export interface SummaryResult {
  summary: string;
  themes: string[];
  available: boolean;
}

async function runPrompt(systemPrompt: string, notes: string): Promise<AnalysisResult> {
  if (getEngineStatus() !== 'ready' || !notes.trim()) {
    return { text: '', available: false };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: notes },
  ];

  try {
    const text = await generateReply(messages);
    return { text, available: true };
  } catch {
    return { text: '', available: false };
  }
}

export function getLiveAnalysis(notes: string): Promise<AnalysisResult> {
  return runPrompt(LIVE_ANALYSIS_SYSTEM_PROMPT, notes);
}

export function parseSummaryResponse(raw: string): { summary: string; themes: string[] } {
  const themesMatch = raw.match(/themes:\s*(.+)$/im);
  if (!themesMatch || themesMatch.index === undefined) {
    return { summary: raw.trim(), themes: [] };
  }

  const themes = themesMatch[1]
    .split(',')
    .map((theme) => theme.trim())
    .filter(Boolean);
  const summary = raw.slice(0, themesMatch.index).trim();
  return { summary, themes };
}

export async function getSessionSummary(notes: string): Promise<SummaryResult> {
  const result = await runPrompt(SUMMARY_SYSTEM_PROMPT, notes);
  if (!result.available) {
    return { summary: '', themes: [], available: false };
  }
  const parsed = parseSummaryResponse(result.text);
  return { ...parsed, available: true };
}
