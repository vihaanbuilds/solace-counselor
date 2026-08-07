import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionNotes } from './SessionNotes';
import * as analysisModule from '../lib/ai/analysis';
import * as webllmEngine from '../lib/ai/webllmEngine';

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  started = false;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
    this.onend?.();
  }

  abort() {
    this.started = false;
  }
}

function finalResultEvent(transcript: string): SpeechRecognitionEvent {
  return {
    resultIndex: 0,
    results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript } } },
  } as unknown as SpeechRecognitionEvent;
}

function interimResultEvent(transcript: string): SpeechRecognitionEvent {
  return {
    resultIndex: 0,
    results: { length: 1, 0: { isFinal: false, length: 1, 0: { transcript } } },
  } as unknown as SpeechRecognitionEvent;
}

function ControlledSessionNotes({
  initialNotes = '',
  onEndSession = () => {},
  ending = false,
}: {
  initialNotes?: string;
  onEndSession?: () => void;
  ending?: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  return (
    <SessionNotes notes={notes} onNotesChange={setNotes} onEndSession={onEndSession} ending={ending} />
  );
}

describe('SessionNotes', () => {
  beforeEach(() => {
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
    vi.spyOn(webllmEngine, 'subscribeToEngineStatus').mockImplementation(() => () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows the crisis banner immediately when crisis language appears in the notes', async () => {
    const user = userEvent.setup();
    vi.spyOn(analysisModule, 'getLiveAnalysis').mockResolvedValue({ text: '', available: false });
    render(<ControlledSessionNotes />);

    const textarea = screen.getByLabelText('Session notes');
    await user.type(textarea, 'I want to die');

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show the crisis banner for ordinary notes', () => {
    render(<ControlledSessionNotes initialNotes="Talked about friendship troubles" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a waiting placeholder when the engine is not ready', () => {
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('loading');
    render(<ControlledSessionNotes initialNotes="Some notes" />);
    expect(screen.getByText(/waiting for the local ai/i)).toBeInTheDocument();
  });

  it('shows a prompt to start typing when the engine is ready but notes are empty', () => {
    render(<ControlledSessionNotes />);
    expect(screen.getByText(/start typing notes/i)).toBeInTheDocument();
  });

  it('calls getLiveAnalysis after the debounce period and renders the result', async () => {
    vi.useFakeTimers();
    const getLiveAnalysisSpy = vi
      .spyOn(analysisModule, 'getLiveAnalysis')
      .mockResolvedValue({
        text: 'Themes: friendship. Questions: how do you feel about it?',
        available: true,
      });

    render(<ControlledSessionNotes initialNotes="Student mentioned feeling left out" />);

    expect(getLiveAnalysisSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(getLiveAnalysisSpy).toHaveBeenCalledWith('Student mentioned feeling left out');
    expect(screen.getByText(/Themes: friendship/)).toBeInTheDocument();
  });

  it('disables the End session button when notes are empty', () => {
    render(<ControlledSessionNotes />);
    expect(screen.getByText('End session')).toBeDisabled();
  });

  it('disables the End session button and shows progress text while ending', () => {
    render(<ControlledSessionNotes initialNotes="Some notes" ending />);
    expect(screen.getByText('Generating summary…')).toBeDisabled();
  });

  it('calls onEndSession when End session is clicked', async () => {
    const user = userEvent.setup();
    const onEndSession = vi.fn();
    render(<ControlledSessionNotes initialNotes="Some notes" onEndSession={onEndSession} />);
    await user.click(screen.getByText('End session'));
    expect(onEndSession).toHaveBeenCalled();
  });

  describe('voice notetaking', () => {
    afterEach(() => {
      delete window.SpeechRecognition;
      FakeSpeechRecognition.instances = [];
    });

    it('disables the mic button when the browser has no SpeechRecognition support', () => {
      render(<ControlledSessionNotes />);
      expect(screen.getByRole('button', { name: /start listening/i })).toBeDisabled();
    });

    it('starts listening and appends a finalized transcript segment to the notes', async () => {
      const user = userEvent.setup();
      window.SpeechRecognition = FakeSpeechRecognition as unknown as new () => SpeechRecognition;
      render(<ControlledSessionNotes />);

      await user.click(screen.getByRole('button', { name: /start listening/i }));
      expect(screen.getByRole('button', { name: /stop listening/i })).toBeInTheDocument();

      const recognition = FakeSpeechRecognition.instances[0];
      act(() => {
        recognition.onresult?.(finalResultEvent('I feel anxious about school'));
      });

      expect(screen.getByLabelText('Session notes')).toHaveValue('I feel anxious about school ');
    });

    it('appends further segments after existing notes with a separating space', async () => {
      const user = userEvent.setup();
      window.SpeechRecognition = FakeSpeechRecognition as unknown as new () => SpeechRecognition;
      render(<ControlledSessionNotes initialNotes="Earlier note." />);

      await user.click(screen.getByRole('button', { name: /start listening/i }));
      const recognition = FakeSpeechRecognition.instances[0];
      act(() => {
        recognition.onresult?.(finalResultEvent('Next thing said.'));
      });

      expect(screen.getByLabelText('Session notes')).toHaveValue('Earlier note. Next thing said. ');
    });

    it('shows a live interim preview without committing it to the notes yet', async () => {
      const user = userEvent.setup();
      window.SpeechRecognition = FakeSpeechRecognition as unknown as new () => SpeechRecognition;
      render(<ControlledSessionNotes />);

      await user.click(screen.getByRole('button', { name: /start listening/i }));
      const recognition = FakeSpeechRecognition.instances[0];
      act(() => {
        recognition.onresult?.(interimResultEvent('still talking'));
      });

      expect(screen.getByText(/still talking/)).toBeInTheDocument();
      expect(screen.getByLabelText('Session notes')).toHaveValue('');
    });

    it('stops listening when the button is clicked again', async () => {
      const user = userEvent.setup();
      window.SpeechRecognition = FakeSpeechRecognition as unknown as new () => SpeechRecognition;
      render(<ControlledSessionNotes />);

      await user.click(screen.getByRole('button', { name: /start listening/i }));
      const recognition = FakeSpeechRecognition.instances[0];
      expect(recognition.started).toBe(true);

      await user.click(screen.getByRole('button', { name: /stop listening/i }));
      expect(recognition.started).toBe(false);
      expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument();
    });

    it('shows a permission error and stops listening when the mic is blocked', async () => {
      const user = userEvent.setup();
      window.SpeechRecognition = FakeSpeechRecognition as unknown as new () => SpeechRecognition;
      render(<ControlledSessionNotes />);

      await user.click(screen.getByRole('button', { name: /start listening/i }));
      const recognition = FakeSpeechRecognition.instances[0];
      act(() => {
        recognition.onerror?.({ error: 'not-allowed' } as SpeechRecognitionErrorEvent);
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/microphone access was blocked/i);
      expect(screen.getByRole('button', { name: /start listening/i })).toBeInTheDocument();
    });
  });
});
