import { useState } from 'react';
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

  const sorted = [...students].sort((a, b) => b.createdAt - a.createdAt);

  function startRename(student: Student) {
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
    const confirmed = window.confirm(
      `Delete "${student.name}" and all of their session history permanently? There is no way to recover this once it's deleted.`
    );
    if (confirmed) {
      onDelete(student.id);
    }
  }

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
          <div className="sidebar-list">
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
                <div className="sidebar-row-actions">
                  <button
                    className="sidebar-icon-btn"
                    aria-label={`Rename ${student.name}`}
                    onClick={() => startRename(student)}
                  >
                    ✏️
                  </button>
                  <button
                    className="sidebar-icon-btn"
                    aria-label={`Delete ${student.name}`}
                    onClick={() => handleDelete(student)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
