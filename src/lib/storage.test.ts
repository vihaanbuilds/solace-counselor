import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveStudents,
  loadStudents,
  saveActiveStudentId,
  loadActiveStudentId,
  saveTheme,
  loadTheme,
  saveSidebarCollapsed,
  loadSidebarCollapsed,
  createId,
  Student,
} from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips students (with nested sessions) through localStorage', () => {
    const students: Student[] = [
      {
        id: 's1',
        name: 'J.D.',
        createdAt: 100,
        sessions: [
          {
            id: 'sess1',
            date: 100,
            notes: 'Talked about family conflict.',
            summary: 'Student discussed tension at home.',
            themes: ['family conflict'],
            hasCrisisFlag: false,
          },
        ],
      },
    ];
    saveStudents(students);
    expect(loadStudents()).toEqual(students);
  });

  it('returns an empty array when nothing is stored', () => {
    expect(loadStudents()).toEqual([]);
  });

  it('round-trips the active student id', () => {
    saveActiveStudentId('s1');
    expect(loadActiveStudentId()).toBe('s1');
  });

  it('generates unique-ish ids', () => {
    const a = createId();
    const b = createId();
    expect(a).not.toBe(b);
  });

  it('round-trips the selected theme', () => {
    saveTheme('dark');
    expect(loadTheme()).toBe('dark');
  });

  it('round-trips the sidebar collapsed preference', () => {
    expect(loadSidebarCollapsed()).toBe(false);
    saveSidebarCollapsed(true);
    expect(loadSidebarCollapsed()).toBe(true);
  });
});
