/** Skip link: first focusable element on every page, visible only on keyboard focus. */
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:font-medium focus:text-canvas"
    >
      Skip to content
    </a>
  );
}
