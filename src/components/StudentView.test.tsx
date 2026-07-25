import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentView } from './StudentView';
import { Student } from '../lib/storage';
import * as webllmEngine from '../lib/ai/webllmEngine';
import * as analysisModule from '../lib/ai/analysis';

const baseStudent: Student = {
  id: 's1',
  name: 'J.D.',
  createdAt: 100,
  sessions: [],
  draftNotes: null,
};

describe('StudentView', () => {
  beforeEach(() => {
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('ready');
    vi.spyOn(webllmEngine, 'subscribeToEngineStatus').mockImplementation(() => () => {});
    vi.spyOn(analysisModule, 'getLiveAnalysis').mockResolvedValue({ text: '', available: false });
  });

  it('shows a "Start new session" button when no session is in progress', () => {
    render(
      <StudentView
        student={baseStudent}
        onNotesChange={() => {}}
        onStartSession={() => {}}
        onEndSession={() => {}}
        ending={false}
      />
    );
    expect(screen.getByText('+ Start new session')).toBeInTheDocument();
    expect(screen.queryByLabelText('Session notes')).not.toBeInTheDocument();
  });

  it('calls onStartSession when the start button is clicked', async () => {
    const user = userEvent.setup();
    const onStartSession = vi.fn();
    render(
      <StudentView
        student={baseStudent}
        onNotesChange={() => {}}
        onStartSession={onStartSession}
        onEndSession={() => {}}
        ending={false}
      />
    );
    await user.click(screen.getByText('+ Start new session'));
    expect(onStartSession).toHaveBeenCalled();
  });

  it('shows SessionNotes instead of the start button when a session is in progress', () => {
    const student: Student = { ...baseStudent, draftNotes: 'Some in-progress notes' };
    render(
      <StudentView
        student={student}
        onNotesChange={() => {}}
        onStartSession={() => {}}
        onEndSession={() => {}}
        ending={false}
      />
    );
    expect(screen.getByLabelText('Session notes')).toHaveValue('Some in-progress notes');
    expect(screen.queryByText('+ Start new session')).not.toBeInTheDocument();
  });

  it('renders past sessions with their summary and theme tags', () => {
    const student: Student = {
      ...baseStudent,
      sessions: [
        {
          id: 'sess1',
          date: new Date('2026-01-01').getTime(),
          notes: 'raw notes here',
          summary: 'Discussed friendship troubles.',
          themes: ['friendship', 'loneliness'],
          hasCrisisFlag: false,
        },
      ],
    };
    render(
      <StudentView
        student={student}
        onNotesChange={() => {}}
        onStartSession={() => {}}
        onEndSession={() => {}}
        ending={false}
      />
    );
    expect(screen.getByText('Discussed friendship troubles.')).toBeInTheDocument();
    expect(screen.getByText('friendship')).toBeInTheDocument();
    expect(screen.getByText('loneliness')).toBeInTheDocument();
  });

  it('shows a crisis tag on past sessions that were flagged', () => {
    const student: Student = {
      ...baseStudent,
      sessions: [
        {
          id: 'sess1',
          date: 100,
          notes: 'notes',
          hasCrisisFlag: true,
        },
      ],
    };
    render(
      <StudentView
        student={student}
        onNotesChange={() => {}}
        onStartSession={() => {}}
        onEndSession={() => {}}
        ending={false}
      />
    );
    expect(screen.getByText(/crisis flag/)).toBeInTheDocument();
  });
});
