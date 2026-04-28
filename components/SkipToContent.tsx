/**
 * Skip-to-content link — visible only on Tab focus.
 * Renders before everything else in the layout. Pressing Tab on page load
 * surfaces the link as the first interactive element.
 */
export function SkipToContent() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      Skip to content
    </a>
  );
}
