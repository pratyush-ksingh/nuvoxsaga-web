'use client';

/**
 * Newsletter signup form: Cloudflare Turnstile + per-brand interest.
 *
 * Turnstile is rendered explicitly once its script has loaded, in
 * "interaction-only" appearance: most visitors never see it; it only appears when
 * Cloudflare wants a human to click. The token is ready before Subscribe is pressed.
 * (The first version rendered on mount, before the async script existed, so no
 * widget was ever created and every signup was rejected for a missing token.)
 */
import { useState, useTransition, useEffect, useRef, useId, useCallback } from 'react';
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
          size?: 'normal' | 'flexible' | 'compact';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (id: string) => void;
      getResponse: (id: string) => string | undefined;
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
  const [tsLoaded, setTsLoaded] = useState(false);

  // useId contains ':' which is not valid in a CSS selector.
  const tsContainerId = `ts_${useId().replace(/:/g, '_')}`;
  const tsWidgetIdRef = useRef<string | null>(null);
  const tsTokenRef = useRef<string | null>(null);

  // The script may already be on the page (client-side navigation back here).
  useEffect(() => {
    if (window.turnstile) setTsLoaded(true);
  }, []);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !window.turnstile || tsWidgetIdRef.current) return;
    tsWidgetIdRef.current = window.turnstile.render(`#${tsContainerId}`, {
      sitekey: SITE_KEY,
      action: 'newsletter',
      theme: 'dark',
      appearance: 'interaction-only',
      callback: (t) => {
        tsTokenRef.current = t;
      },
      'expired-callback': () => {
        tsTokenRef.current = null;
        if (tsWidgetIdRef.current) window.turnstile?.reset(tsWidgetIdRef.current);
      },
      'error-callback': () => {
        tsTokenRef.current = null;
      },
    });
  }, [tsContainerId]);

  useEffect(() => {
    if (tsLoaded) renderWidget();
  }, [tsLoaded, renderWidget]);

  function toggleBrand(id: BrandId) {
    setBrands((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  async function submit() {
    setErrorMsg(null);
    setState('sending');

    // The token is normally ready already; give an in-progress challenge up to 8s.
    for (let i = 0; i < 80 && SITE_KEY && !tsTokenRef.current; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const turnstileToken = tsTokenRef.current ?? '';
    // A token is single-use: clear it and fetch a fresh one for any retry.
    tsTokenRef.current = null;
    if (tsWidgetIdRef.current) window.turnstile?.reset(tsWidgetIdRef.current);
    if (SITE_KEY && !turnstileToken) {
      setState('error');
      setErrorMsg('The spam check did not finish. Check your connection, then try again.');
      return;
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
        setErrorMsg(
          res.status === 400
            ? 'We could not verify this request. Check the address, then try again.'
            : 'Signup is temporarily unavailable. Try again in a few minutes.',
        );
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
      <p role="status" className="max-w-xl rounded-2xl bg-surface px-5 py-4 text-ink">
        Check your inbox. The confirmation link is valid for 24 hours.
      </p>
    );
  }

  return (
    <>
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTsLoaded(true)}
          onReady={() => setTsLoaded(true)}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(submit);
        }}
        className="flex max-w-xl flex-col gap-4"
      >
        <label htmlFor="nl-email" className="sr-only">
          Email address
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="nl-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            aria-describedby="nl-note"
            className="h-12 flex-1 rounded-full border border-hairline bg-surface px-5 text-ink placeholder:text-ink-3 transition-colors duration-150 focus:border-ink focus:outline-none"
          />
          <button type="submit" disabled={pending} className="btn-primary justify-center disabled:opacity-60">
            {pending ? 'Sending…' : 'Subscribe'}
          </button>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm text-ink-2">Send me stories from</legend>
          {BRANDS.map((b) => (
            <label
              key={b.id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm text-ink-2 transition-colors duration-150 has-[:checked]:border-ink has-[:checked]:text-ink"
            >
              <input
                type="checkbox"
                name="brands"
                checked={brands.includes(b.id)}
                onChange={() => toggleBrand(b.id)}
                className="size-4 accent-[var(--ink)]"
              />
              {b.name.replace('Nuvox ', '')}
            </label>
          ))}
        </fieldset>
        <p id="nl-note" className="text-sm text-ink-3">
          Double opt-in. Unsubscribe in one click.
        </p>
        <p aria-live="polite" className="text-sm text-[#ff8a8a] empty:hidden">
          {errorMsg}
        </p>
        <div id={tsContainerId} />
      </form>
    </>
  );
}
