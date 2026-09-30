/**
 * Inline JSON-LD blocks. Every `<` is escaped as <, so a headline can never close
 * the script element, whatever it contains.
 */
export function JsonLd({ schemas }: { schemas: readonly unknown[] }) {
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Raw script content is what JSON-LD requires; the value is our own serialised JSON.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
