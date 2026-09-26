import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'locus-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // Storage access error fallback
    }
    return 'dark'; // Default to Incident Command dark mode
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const computeResolvedTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const applyThemeToDOM = (resolved: 'light' | 'dark') => {
      const root = document.documentElement;
      const body = document.body;

      if (resolved === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        if (body) {
          body.classList.add('dark');
          body.classList.remove('light');
          body.style.backgroundColor = '#090a0f';
          body.style.color = '#f8fafc';
        }
        root.style.colorScheme = 'dark';
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        if (body) {
          body.classList.add('light');
          body.classList.remove('dark');
          body.style.backgroundColor = '#f8fafc';
          body.style.color = '#0f172a';
        }
        root.style.colorScheme = 'light';
      }
    };

    const newResolved = computeResolvedTheme();
    setResolvedTheme(newResolved);
    applyThemeToDOM(newResolved);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage access error fallback
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const updated = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(updated);
        applyThemeToDOM(updated);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      return resolvedTheme === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
