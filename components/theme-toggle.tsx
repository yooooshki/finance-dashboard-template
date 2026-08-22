'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Lights on' : 'Lights off'}
      className="group relative flex h-11 w-11 items-center justify-center overflow-hidden border-[3px] border-(--ink) bg-(--bg) shadow-[3px_3px_0_var(--ink)] transition-all hover:bg-(--tertiary) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      <span
        className={`text-xl leading-none transition-transform duration-300 ease-out ${
          mounted ? (isDark ? 'rotate-[360deg]' : 'rotate-0') : ''
        } group-hover:scale-110`}
        aria-hidden="true"
      >
        {isDark ? '☾' : '☀'}
      </span>
    </button>
  );
}
