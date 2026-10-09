/**
 * An email address shown as plain text. Cloudflare's email obfuscation rewrites every
 * address it finds in the HTML into a script-decoded link, which reads "[email protected]"
 * to anyone without JavaScript, to crawlers and to reviewers. The <!--email_off--> markers
 * tell Cloudflare to leave this one alone, so one readable copy exists beside the
 * obfuscated mailto: links.
 *
 * SECURITY: the only way to emit an HTML comment from JSX is innerHTML, so the address is
 * first matched against a strict pattern (letters, digits, . _ + - and one @); anything
 * else is rendered as ordinary escaped text.
 */
const EMAIL_RE = /^[a-z0-9._+-]{1,64}@[a-z0-9.-]{3,253}$/i;

export function PlainEmail({ address }: { address: string }) {
  const domain = address.split('@')[1] ?? '';
  if (!EMAIL_RE.test(address) || !domain.includes('.') || domain.includes('..')) {
    return <span className="text-ink">{address}</span>;
  }
  return (
    <span
      className="text-ink underline underline-offset-4"
      // Validated above; only the comment markers need innerHTML.
      dangerouslySetInnerHTML={{ __html: `<!--email_off-->${address}<!--/email_off-->` }}
    />
  );
}
