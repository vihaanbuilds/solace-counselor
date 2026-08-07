import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StudentView } from './components/StudentView';
import { ThemeToggle } from './components/ThemeToggle';
import { AiStatusIndicator } from './components/AiStatusIndicator';
import { AiLoadingBanner } from './components/AiLoadingBanner';
import { AmbientBackground } from './components/AmbientBackground';
import { CursiveReveal } from './components/CursiveReveal';
import { isCrisis } from './lib/emotions/crisisDetection';
import { getSessionSummary } from './lib/ai/analysis';
import {
  Student,
  Session,
  createId,
  loadStudents,
  saveStudents,
  loadActiveStudentId,
  saveActiveStudentId,
  loadTheme,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
} from './lib/storage';
import './styles/theme.css';

function createStudent(): Student {
  return {
    id: createId(),
    name: 'New student',
    createdAt: Date.now(),
    sessions: [],
    draftNotes: null,
  };
}

export default function App() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => loadSidebarCollapsed() || window.matchMedia('(max-width: 768px)').matches
  );
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    const theme = loadTheme();
    if (theme) document.documentElement.setAttribute('data-theme', theme);

    const loaded = loadStudents();
    setStudents(loaded);

    if (loaded.length > 0) {
      const storedActiveId = loadActiveStudentId();
      const activeExists = storedActiveId && loaded.some((s) => s.id === storedActiveId);
      setActiveStudentId(activeExists ? (storedActiveId as string) : loaded[0].id);
    }
  }, []);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === activeStudentId) ?? null,
    [students, activeStudentId]
  );

  function persist(next: Student[]) {
    setStudents(next);
    saveStudents(next);
  }

  function closeSidebarOnMobile() {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setSidebarCollapsed(true);
    }
  }

  function handleNewStudent() {
    const fresh = createStudent();
    persist([fresh, ...students]);
    setActiveStudentId(fresh.id);
    saveActiveStudentId(fresh.id);
    closeSidebarOnMobile();
  }

  function handleSelectStudent(id: string) {
    setActiveStudentId(id);
    saveActiveStudentId(id);
    closeSidebarOnMobile();
  }

  function handleRenameStudent(id: string, name: string) {
    persist(students.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function handleDeleteStudent(id: string) {
    const remaining = students.filter((s) => s.id !== id);
    persist(remaining);

    if (id === activeStudentId) {
      if (remaining.length === 0) {
        setActiveStudentId(null);
      } else {
        setActiveStudentId(remaining[0].id);
        saveActiveStudentId(remaining[0].id);
      }
    }
  }

  function handleStartSession() {
    if (!activeStudentId) return;
    persist(
      students.map((s) => (s.id === activeStudentId ? { ...s, draftNotes: '' } : s))
    );
  }

  function handleNotesChange(notes: string) {
    if (!activeStudentId) return;
    persist(
      students.map((s) => (s.id === activeStudentId ? { ...s, draftNotes: notes } : s))
    );
  }

  async function handleEndSession() {
    if (!activeStudent) return;
    const notes = activeStudent.draftNotes ?? '';
    setEnding(true);

    const result = await getSessionSummary(notes);

    const session: Session = {
      id: createId(),
      date: Date.now(),
      notes,
      summary: result.available ? result.summary : undefined,
      themes: result.available ? result.themes : undefined,
      hasCrisisFlag: isCrisis(notes),
    };

    persist(
      students.map((s) =>
        s.id === activeStudent.id
          ? { ...s, draftNotes: null, sessions: [...s.sessions, session] }
          : s
      )
    );
    setEnding(false);
  }

  if (!acknowledged) {
    return (
      <div className="onboarding-screen">
        <AmbientBackground />
        <div className="onboarding-card glass-strong">
          <h1 className="brand-title">
            <CursiveReveal variant="solace" className="cursive-reveal-hero" />
            <span className="brand-suffix">for Counselors</span>
          </h1>
          <p className="disclaimer-text">
            <strong>Prototype — not for use with real student records yet.</strong> This
            tool is a working demo, not reviewed for compliance with FERPA or your
            school's data privacy policies. Everything you type stays only in this
            browser (no server, no account, no data transmitted anywhere) — but that also
            means there's no encryption, no multi-device access, and no protection if
            someone else uses this computer.
          </p>
          <p className="disclaimer-text">
            The AI never diagnoses or makes clinical judgments — it only surfaces
            observations and possible questions. Crisis-language detection is a
            safety-net reminder, not a substitute for your own training and judgment.
          </p>
          <button onClick={() => setAcknowledged(true)}>I understand, continue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <AmbientBackground />
      {!sidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        students={students}
        activeStudentId={activeStudentId}
        onSelect={handleSelectStudent}
        onNewStudent={handleNewStudent}
        onRename={handleRenameStudent}
        onDelete={handleDeleteStudent}
        collapsed={sidebarCollapsed}
      />
      <div className="main-column">
        <header className="app-header">
          <div className="app-header-controls">
            <button
              className="sidebar-toggle-btn glass"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? 'Show student list' : 'Hide student list'}
              title={sidebarCollapsed ? 'Show student list' : 'Hide student list'}
            >
              {sidebarCollapsed ? '☰' : '⟨'}
            </button>
            <h1 className="brand-title">
              <CursiveReveal variant="solace" className="cursive-reveal-header" />
              <span className="brand-suffix">for Counselors</span>
            </h1>
          </div>
          <div className="app-header-controls">
            <AiStatusIndicator />
            <ThemeToggle />
          </div>
        </header>
        <AiLoadingBanner />
        {activeStudent ? (
          <StudentView
            student={activeStudent}
            onNotesChange={handleNotesChange}
            onStartSession={handleStartSession}
            onEndSession={handleEndSession}
            ending={ending}
          />
        ) : (
          <div className="empty-state">
            <CursiveReveal variant="solace" className="cursive-reveal-empty" />
            <p>Add a student from the sidebar to start a session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
