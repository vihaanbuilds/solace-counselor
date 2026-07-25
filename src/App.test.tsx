import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { loadStudents } from './lib/storage';
import * as webllmEngine from './lib/ai/webllmEngine';
import * as analysisModule from './lib/ai/analysis';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(webllmEngine, 'loadEngine').mockImplementation(() => {});
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('idle');
    vi.spyOn(webllmEngine, 'subscribeToEngineStatus').mockImplementation(() => () => {});
    vi.spyOn(analysisModule, 'getLiveAnalysis').mockResolvedValue({ text: '', available: false });
    vi.spyOn(analysisModule, 'getSessionSummary').mockResolvedValue({
      summary: 'AI summary of the session.',
      themes: ['friendship'],
      available: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function acknowledgeDisclaimer(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getByText('I understand, continue'));
  }

  function getSidebar(): HTMLElement {
    return document.querySelector('.sidebar') as HTMLElement;
  }

  it('shows the prototype disclaimer before entering the app', () => {
    render(<App />);
    expect(screen.getByText(/not for use with real student records/i)).toBeInTheDocument();
  });

  it('shows an empty state with no students yet', async () => {
    const user = userEvent.setup();
    await acknowledgeDisclaimer(user);
    expect(screen.getByText(/add a student from the sidebar/i)).toBeInTheDocument();
  });

  it('creates a new student and selects them', async () => {
    const user = userEvent.setup();
    await acknowledgeDisclaimer(user);

    await user.click(screen.getByText('+ New student'));

    expect(screen.getAllByText('New student')).toHaveLength(2); // sidebar item + heading
    expect(screen.getByText('+ Start new session')).toBeInTheDocument();
    expect(loadStudents()).toHaveLength(1);
  });

  it('starts a session, types notes, and ends the session saving a summary', async () => {
    const user = userEvent.setup();
    await acknowledgeDisclaimer(user);
    await user.click(screen.getByText('+ New student'));
    await user.click(screen.getByText('+ Start new session'));

    const textarea = screen.getByLabelText('Session notes');
    await user.type(textarea, 'Student discussed friendship troubles.');
    await user.click(screen.getByText('End session'));

    await waitFor(() => {
      expect(screen.getByText('AI summary of the session.')).toBeInTheDocument();
    });
    expect(screen.getByText('friendship')).toBeInTheDocument();
    expect(screen.getByText('+ Start new session')).toBeInTheDocument();

    const students = loadStudents();
    expect(students[0].sessions).toHaveLength(1);
    expect(students[0].draftNotes).toBeNull();
  });

  it('flags a session as crisis when crisis language was typed, even after ending', async () => {
    const user = userEvent.setup();
    await acknowledgeDisclaimer(user);
    await user.click(screen.getByText('+ New student'));
    await user.click(screen.getByText('+ Start new session'));

    const textarea = screen.getByLabelText('Session notes');
    await user.type(textarea, 'The student said they want to die.');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByText('End session'));

    await waitFor(() => {
      expect(loadStudents()[0].sessions[0].hasCrisisFlag).toBe(true);
    });
  });

  it('renaming a student persists the new name', async () => {
    const user = userEvent.setup();
    await acknowledgeDisclaimer(user);
    await user.click(screen.getByText('+ New student'));

    await user.click(within(getSidebar()).getByLabelText(/^Rename/));
    const input = screen.getByLabelText('Rename student');
    await user.clear(input);
    await user.type(input, 'J.D.{Enter}');

    expect(within(getSidebar()).getByText('J.D.')).toBeInTheDocument();
    expect(loadStudents()[0].name).toBe('J.D.');
  });

  it('deleting a student removes them and shows the empty state when none remain', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await acknowledgeDisclaimer(user);
    await user.click(screen.getByText('+ New student'));

    await user.click(within(getSidebar()).getByLabelText(/^Delete/));

    expect(loadStudents()).toHaveLength(0);
    expect(screen.getByText(/add a student from the sidebar/i)).toBeInTheDocument();
  });

  it('persists students and active selection across a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByText('I understand, continue'));
    await user.click(screen.getByText('+ New student'));
    unmount();

    render(<App />);
    await user.click(screen.getByText('I understand, continue'));
    expect(screen.getAllByText('New student')).toHaveLength(2);
  });

  describe('sidebar collapse', () => {
    it('toggles sidebar visibility and back', async () => {
      const user = userEvent.setup();
      await acknowledgeDisclaimer(user);

      expect(screen.getByText('+ New student')).toBeInTheDocument();
      await user.click(screen.getByLabelText('Hide student list'));
      expect(screen.queryByText('+ New student')).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Show student list'));
      expect(screen.getByText('+ New student')).toBeInTheDocument();
    });
  });
});
