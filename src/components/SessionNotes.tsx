import { useEffect, useRef, useState } from 'react';
import { isCrisis } from '../lib/emotions/crisisDetection';
import { getLiveAnalysis, AnalysisResult } from '../lib/ai/analysis';
import { getEngineStatus, subscribeToEngineStatus, EngineStatus } from '../lib/ai/webllmEngine';

interface SessionNotesProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onEndSession: () => void;
  ending: boolean;
}

const ANALYSIS_DEBOUNCE_MS = 2000;

export function SessionNotes({ notes, onNotesChange, onEndSession, ending }: SessionNotesProps) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() => getEngineStatus());
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => subscribeToEngineStatus((status) => setEngineStatus(status)), []);

  const crisisDetected = isCrisis(notes);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!notes.trim()) {
      setAnalysis(null);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      getLiveAnalysis(notes).then(setAnalysis);
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [notes]);

  return (
    <div className="session-notes">
      {crisisDetected && (
        <div className="crisis-flag-banner" role="alert">
          ⚠ Crisis-indicating language detected in these notes — consider your school's
          crisis protocol.
        </div>
      )}
      <div className="session-notes-layout">
        <textarea
          className="session-notes-textarea glass"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Type notes as the conversation happens..."
          aria-label="Session notes"
        />
        <div className="session-analysis-panel glass" aria-live="polite">
          <h3>AI Assist</h3>
          {engineStatus !== 'ready' && (
            <p className="session-analysis-placeholder">
              Waiting for the local AI to finish loading — themes and suggested questions
              will appear here once it's ready.
            </p>
          )}
          {engineStatus === 'ready' && !notes.trim() && (
            <p className="session-analysis-placeholder">
              Start typing notes to see themes and suggested questions.
            </p>
          )}
          {engineStatus === 'ready' && notes.trim() && !analysis && (
            <p className="session-analysis-placeholder">Analyzing…</p>
          )}
          {analysis?.available && <p className="session-analysis-text">{analysis.text}</p>}
        </div>
      </div>
      <button className="end-session-btn" onClick={onEndSession} disabled={ending || !notes.trim()}>
        {ending ? 'Generating summary…' : 'End session'}
      </button>
    </div>
  );
}
