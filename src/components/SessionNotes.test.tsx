import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionNotes } from './SessionNotes';
import * as analysisModule from '../lib/ai/analysis';
import * as webllmEngine from '../lib/ai/webllmEngine';

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
});
