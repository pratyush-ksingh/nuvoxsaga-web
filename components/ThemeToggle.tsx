'use client';

/**
 * Light / dark switch (DESIGN.md §3). Light is the default reading theme; a reader's
 * choice is kept in localStorage and applied before first paint by THEME_SCRIPT in the
 * root layout (lib/theme.ts), so a dark reader never sees a light flash.
 */
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_KEY as KEY } from '@/lib/theme';

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.dataset.theme === 'dark';

export function ThemeToggle({ className = '' }: { className?: string }) {
  // Server snapshot is light, matching the static HTML; the real value arrives on hydration.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !dark;
    if (next) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* private mode or blocked storage: the switch still works for this page view */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light' : 'Switch to dark'}
      className={`inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface hover:text-ink ${className}`}
    >
      {dark ? <Sun aria-hidden="true" size={18} strokeWidth={1.75} /> : <Moon aria-hidden="true" size={18} strokeWidth={1.75} />}
    </button>
  );
}
