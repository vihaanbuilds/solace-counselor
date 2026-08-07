import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Student } from '../lib/storage';

interface SidebarProps {
  students: Student[];
  activeStudentId: string | null;
  onSelect: (id: string) => void;
  onNewStudent: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
}

const MENU_WIDTH = 168;

function buildTranscript(student: Student): string {
  const sessions = [...student.sessions].sort((a, b) => a.date - b.date);
  const lines = sessions.map((s) => {
    const date = new Date(s.date).toLocaleDateString();
    const parts = [`${date}${s.hasCrisisFlag ? ' — crisis flag' : ''}`];
    if (s.themes && s.themes.length > 0) parts.push(`Themes: ${s.themes.join(', ')}`);
    if (s.summary) parts.push(s.summary);
    return parts.join('\n');
  });
  return [`Solace Counselor session history — ${student.name}`, '', ...lines].join('\n\n');
}

export function Sidebar({
  students,
  activeStudentId,
  onSelect,
  onNewStudent,
  onRename,
  onDelete,
  collapsed,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const kebabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuNodeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = [...students].sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    if (!openMenuId) return;

    function isInsideMenu(target: EventTarget | null) {
      if (!(target instanceof Node)) return false;
      if (menuNodeRef.current?.contains(target)) return true;
      const kebab = openMenuId ? kebabRefs.current[openMenuId] : null;
      return kebab ? kebab.contains(target) : false;
    }

    function handlePointerDown(e: MouseEvent) {
      if (!isInsideMenu(e.target)) setOpenMenuId(null);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenuId(null);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  function toggleMenu(student: Student) {
    if (openMenuId === student.id) {
      setOpenMenuId(null);
      return;
    }
    const btn = kebabRefs.current[student.id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
    }
    setOpenMenuId(student.id);
  }

  function startRename(student: Student) {
    setOpenMenuId(null);
    setRenamingId(student.id);
    setDraftName(student.name);
  }

  function commitRename(id: string) {
    const trimmed = draftName.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
  }

  function handleDelete(student: Student) {
    setOpenMenuId(null);
    const confirmed = window.confirm(
      `Delete "${student.name}" and all of their session history permanently? There is no way to recover this once it's deleted.`
    );
    if (confirmed) {
      onDelete(student.id);
    }
  }

  async function handleShare(student: Student) {
    setOpenMenuId(null);
    const transcript = buildTranscript(student);
    const shareData = { title: `Solace Counselor — ${student.name}`, text: transcript };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('Share failed', err);
        }
      }
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(transcript);
        window.alert("Sharing isn't supported in this browser — copied the session history to your clipboard instead.");
        return;
      } catch {
        // fall through to the final alert below
      }
    }

    window.alert("Sharing isn't supported in this browser.");
  }

  const menuStudent = openMenuId ? sorted.find((s) => s.id === openMenuId) : undefined;

  return (
    <nav
      className={`sidebar glass ${collapsed ? 'sidebar-collapsed' : ''}`}
      aria-label="Student list"
      aria-hidden={collapsed}
    >
      {!collapsed && (
        <>
          <button className="sidebar-new-chat" onClick={onNewStudent}>
            + New student
          </button>
          {sorted.length > 0 && <div className="sidebar-label">Students</div>}
          <div className="sidebar-list" ref={listRef} onScroll={() => setOpenMenuId(null)}>
            {sorted.map((student) => (
              <div key={student.id} className="sidebar-row">
                {renamingId === student.id ? (
                  <input
                    className="sidebar-rename-input"
                    value={draftName}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitRename(student.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(student.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    aria-label="Rename student"
                  />
                ) : (
                  <button
                    className={`sidebar-item ${
                      student.id === activeStudentId ? 'sidebar-item-active' : ''
                    }`}
                    onClick={() => onSelect(student.id)}
                    aria-current={student.id === activeStudentId ? 'true' : undefined}
                  >
                    {student.name}
                  </button>
                )}
                <div
                  className={`sidebar-row-actions ${
                    openMenuId === student.id ? 'sidebar-row-actions-open' : ''
                  }`}
                >
                  <button
                    ref={(el) => (kebabRefs.current[student.id] = el)}
                    className="sidebar-menu-btn"
                    aria-label={`Options for ${student.name}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === student.id}
                    onClick={() => toggleMenu(student)}
                  >
                    ⋮
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {openMenuId &&
        menuStudent &&
        menuPosition &&
        createPortal(
          <div
            ref={menuNodeRef}
            className="sidebar-row-menu glass"
            role="menu"
            aria-label={`${menuStudent.name} actions`}
            style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
          >
            <button
              role="menuitem"
              className="sidebar-row-menu-item"
              onClick={() => startRename(menuStudent)}
            >
              ✏️ Rename
            </button>
            <button
              role="menuitem"
              className="sidebar-row-menu-item"
              onClick={() => handleShare(menuStudent)}
            >
              📤 Share
            </button>
            <button
              role="menuitem"
              className="sidebar-row-menu-item sidebar-row-menu-item-danger"
              onClick={() => handleDelete(menuStudent)}
            >
              🗑️ Delete
            </button>
          </div>,
          document.body
        )}
    </nav>
  );
}
