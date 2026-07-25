import { Student } from '../lib/storage';
import { SessionNotes } from './SessionNotes';

interface StudentViewProps {
  student: Student;
  onNotesChange: (notes: string) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  ending: boolean;
}

export function StudentView({
  student,
  onNotesChange,
  onStartSession,
  onEndSession,
  ending,
}: StudentViewProps) {
  const sessions = [...student.sessions].sort((a, b) => b.date - a.date);
  const inSession = student.draftNotes !== null && student.draftNotes !== undefined;

  return (
    <div className="student-view">
      <h2 className="student-name">{student.name}</h2>

      {inSession ? (
        <SessionNotes
          notes={student.draftNotes ?? ''}
          onNotesChange={onNotesChange}
          onEndSession={onEndSession}
          ending={ending}
        />
      ) : (
        <button className="start-session-btn" onClick={onStartSession}>
          + Start new session
        </button>
      )}

      {sessions.length > 0 && (
        <div className="session-history">
          <h3 className="session-history-label">Past sessions</h3>
          {sessions.map((session) => (
            <details key={session.id} className="session-history-item glass">
              <summary>
                {new Date(session.date).toLocaleDateString()}
                {session.hasCrisisFlag && (
                  <span className="session-crisis-tag">⚠ crisis flag</span>
                )}
              </summary>
              {session.themes && session.themes.length > 0 && (
                <div className="session-themes">
                  {session.themes.map((theme) => (
                    <span key={theme} className="session-theme-tag">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
              {session.summary && <p className="session-summary-text">{session.summary}</p>}
              <details className="session-raw-notes">
                <summary>Raw notes</summary>
                <p>{session.notes}</p>
              </details>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
