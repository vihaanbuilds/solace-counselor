import { useEffect, useState } from 'react';
import { loadTheme, saveTheme } from '../lib/storage';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (loadTheme() as Theme) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      aria-label="Toggle theme"
      className="theme-toggle glass"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
