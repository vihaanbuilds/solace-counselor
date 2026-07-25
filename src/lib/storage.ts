export interface Session {
  id: string;
  date: number;
  notes: string;
  summary?: string;
  themes?: string[];
  hasCrisisFlag: boolean;
}

export interface Student {
  id: string;
  name: string;
  createdAt: number;
  sessions: Session[];
  draftNotes?: string | null;
}

const STUDENTS_KEY = 'solace-counselor.students';
const ACTIVE_STUDENT_KEY = 'solace-counselor.activeStudentId';
const THEME_KEY = 'solace-counselor.theme';
const SIDEBAR_COLLAPSED_KEY = 'solace-counselor.sidebarCollapsed';

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveStudents(students: Student[]): void {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function loadStudents(): Student[] {
  const raw = localStorage.getItem(STUDENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Student[];
  } catch {
    return [];
  }
}

export function saveActiveStudentId(id: string): void {
  localStorage.setItem(ACTIVE_STUDENT_KEY, id);
}

export function loadActiveStudentId(): string | null {
  return localStorage.getItem(ACTIVE_STUDENT_KEY);
}

export function saveTheme(theme: string): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function loadTheme(): string | null {
  return localStorage.getItem(THEME_KEY);
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}

export function loadSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}
