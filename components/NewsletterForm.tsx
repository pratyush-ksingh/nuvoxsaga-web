'use client';

/**
 * Newsletter signup form — Cloudflare Turnstile (invisible) + per-brand interest.
 *
 * Loads Turnstile JS only on the client, only after the form is in viewport
 * (cheap LCP). Falls back gracefully when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is missing (dev) — submits without a token; server accepts in dev.
 */
import { useState, useTransition, useEffect, useRef, useId } from 'react';
import Script from 'next/script';
import { BRANDS, type BrandId } from '@/lib/brands';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
          size?: 'normal' | 'flexible' | 'compact' | 'invisible';
        },
      ) => string;
      reset: (id: string) => void;
      execute: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type State = 'idle' | 'sending' | 'sent' | 'error';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [brands, setBrands] = useState<BrandId[]>(['nuvox_ai']);
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Phase 10 review L-1: replace only the `:` separators that aren't valid
  // in CSS selectors — keep the rest of useId's uniqueness payload.
  const tsContainerId = `ts_${useId().replace(/:/g, '_')}`;
  const tsWidgetIdRef = useRef<string | null>(null);
  const tsTokenRef = useRef<string | null>(null);

  // Render the invisible Turnstile widget once script is loaded.
  useEffect(() => {
    if (!SITE_KEY || !window.turnstile) return;
    if (tsWidgetIdRef.current) return;
    tsWidgetIdRef.current = window.turnstile.render(`#${tsContainerId}`, {
      sitekey: SITE_KEY,
      action: 'newsletter',
      size: 'invisible',
      callback: (t) => {
        tsTokenRef.current = t;
      },
      'error-callback': () => {
        tsTokenRef.current = null;
      },
    });
  }, [tsContainerId]);

  function toggleBrand(id: BrandId) {
    setBrands((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  async function submit() {
    setErrorMsg(null);
    setState('sending');

    // Trigger invisible Turnstile if configured
    let turnstileToken = tsTokenRef.current ?? '';
    if (SITE_KEY && window.turnstile && tsWidgetIdRef.current) {
      window.turnstile.execute(tsWidgetIdRef.current);
      // wait briefly for callback
      for (let i = 0; i < 30 && !tsTokenRef.current; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      turnstileToken = tsTokenRef.current ?? '';
    }

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          brands,
          turnstile: turnstileToken,
        }),
      });
      if (res.status === 429) {
        setState('error');
        setErrorMsg('Too many tries from this address. Try again in an hour.');
        return;
      }
      if (!res.ok) {
        setState('error');
        setErrorMsg('Something went wrong. Try again.');
        return;
      }
      setState('sent');
      setEmail('');
    } catch {
      setState('error');
      setErrorMsg('Network error. Try again.');
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        Check your inbox — confirmation link valid for 24 hours.
      </div>
    );
  }

  return (
    <>
      {SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(submit);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="nl-email" className="text-xs uppercase tracking-wider text-foreground/40">
          Newsletter
        </label>
        <div className="flex gap-2">
          <input
            id="nl-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="flex-1 rounded-md border border-white/10 bg-card px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !email}
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Subscribe'}
          </button>
        </div>
        <fieldset className="flex flex-wrap gap-3 mt-1">
          <legend className="sr-only">Brands of interest</legend>
          {BRANDS.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-xs text-foreground/60 cursor-pointer">
              <input
                type="checkbox"
                checked={brands.includes(b.id)}
                onChange={() => toggleBrand(b.id)}
                className="size-3.5 accent-[var(--brand)]"
              />
              {b.name.replace('Nuvox ', '')}
            </label>
          ))}
        </fieldset>
        {errorMsg && (
          <p role="alert" className="text-xs text-rose-300">
            {errorMsg}
          </p>
        )}
        <div id={tsContainerId} aria-hidden="true" />
      </form>
    </>
  );
}
