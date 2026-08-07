import { useEffect, useRef, useState } from 'react';
import { isCrisis } from '../lib/emotions/crisisDetection';
import { getLiveAnalysis, AnalysisResult } from '../lib/ai/analysis';
import { getEngineStatus, subscribeToEngineStatus, EngineStatus } from '../lib/ai/webllmEngine';
import {
  createSpeechNotetaker,
  isSpeechNotetakingSupported,
  SpeechNotetaker,
} from '../lib/voice/speechNotetaker';
import { CursiveReveal } from './CursiveReveal';

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
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notetakerRef = useRef<SpeechNotetaker | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const voiceSupported = isSpeechNotetakingSupported();

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

  // Auto-grow the notes textarea with its content, up to the CSS max-height
  // cap (beyond which it scrolls internally) — this is also what lets it
  // gradually cover the ambient "Solace" mark filling the space below it.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [notes]);

  useEffect(() => {
    return () => {
      notetakerRef.current?.stop();
    };
  }, []);

  function appendFinalSegment(text: string) {
    if (!text) return;
    const current = notesRef.current;
    const needsSpace = current.length > 0 && !/\s$/.test(current);
    onNotesChange(`${current}${needsSpace ? ' ' : ''}${text} `);
  }

  function toggleListening() {
    if (listening) {
      notetakerRef.current?.stop();
      notetakerRef.current = null;
      setListening(false);
      setInterimText('');
      return;
    }

    const notetaker = createSpeechNotetaker({
      onFinalSegment: appendFinalSegment,
      onInterimChange: setInterimText,
      onError: (message) => {
        setVoiceError(
          message === 'not-allowed'
            ? 'Microphone access was blocked — allow it in your browser settings to use voice notetaking.'
            : message === 'restart-failed'
              ? 'Voice notetaking lost the mic and could not reconnect — click "Start listening" to resume.'
              : `Voice notetaking stopped: ${message}`
        );
        setListening(false);
        notetakerRef.current = null;
      },
      onEnd: () => {
        setListening(false);
        setInterimText('');
      },
    });

    if (!notetaker) {
      setVoiceError("Voice notetaking isn't supported in this browser.");
      return;
    }

    setVoiceError(null);
    notetakerRef.current = notetaker;
    notetaker.start();
    setListening(true);
  }

  return (
    <div className="session-notes">
      {crisisDetected && (
        <div className="crisis-flag-banner" role="alert">
          ⚠ Crisis-indicating language detected in these notes — consider your school's
          crisis protocol.
        </div>
      )}
      <div className="session-notes-layout">
        <div className="session-notes-main">
          <div className="notes-toolbar">
            <button
              type="button"
              className={`mic-toggle-btn ${listening ? 'mic-toggle-btn-active' : ''}`}
              onClick={toggleListening}
              disabled={!voiceSupported}
              aria-pressed={listening}
              title={voiceSupported ? undefined : "Voice notetaking isn't supported in this browser"}
            >
              {listening ? '⏹ Stop listening' : '🎤 Start listening'}
            </button>
            {listening && (
              <span className="listening-indicator">
                <span className="listening-dot" aria-hidden="true" />
                {interimText ? `Listening: "${interimText}"` : 'Listening…'}
              </span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            className="session-notes-textarea glass"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Type notes as the conversation happens, or turn on the mic to have Solace listen and take notes for you..."
            aria-label="Session notes"
          />
          {voiceError && (
            <p className="voice-error-text" role="alert">
              {voiceError}
            </p>
          )}
        </div>
        <div className="session-analysis-panel glass" aria-live="polite">
          <h3>AI Assist</h3>
          {engineStatus !== 'ready' && (
            <p className="session-analysis-placeholder">
              Waiting for the local AI to finish loading — themes, suggested questions,
              and things you could say will appear here once it's ready.
            </p>
          )}
          {engineStatus === 'ready' && !notes.trim() && (
            <p className="session-analysis-placeholder">
              Start typing notes (or start listening) to see themes, suggested questions,
              and supportive things you could say to the student.
            </p>
          )}
          {engineStatus === 'ready' && notes.trim() && !analysis && (
            <p className="session-analysis-placeholder">Analyzing…</p>
          )}
          {analysis?.available && <p className="session-analysis-text">{analysis.text}</p>}
        </div>
      </div>
      <div className="session-notes-canvas" aria-hidden="true">
        <CursiveReveal variant="solace" className="cursive-reveal-canvas" />
      </div>
      <button className="end-session-btn" onClick={onEndSession} disabled={ending || !notes.trim()}>
        {ending ? 'Generating summary…' : 'End session'}
      </button>
    </div>
  );
}
