/**
 * Migration body-shape detection.
 *
 * Regression guard for the silent-corruption bug where Ghost posts
 * (Lexical-native JSON) were being wrapped as a single {type:'html'} node,
 * flattening inline structure on import to Payload.
 */
import { describe, it, expect } from 'vitest';
import { toBody, isLexicalRoot } from '../scripts/migrate-lexical';

describe('isLexicalRoot', () => {
  it('accepts a valid Lexical root', () => {
    expect(isLexicalRoot({ root: { type: 'root', children: [] } })).toBe(true);
  });

  it('rejects null', () => {
    expect(isLexicalRoot(null)).toBe(false);
  });

  it('rejects bare strings', () => {
    expect(isLexicalRoot('<p>hi</p>')).toBe(false);
  });

  it('rejects shape without children array', () => {
    expect(isLexicalRoot({ root: { type: 'root', children: {} } })).toBe(false);
  });

  it('rejects root.type !== "root"', () => {
    expect(isLexicalRoot({ root: { type: 'paragraph', children: [] } })).toBe(false);
  });

  it('rejects shape without root key', () => {
    expect(isLexicalRoot({ children: [] })).toBe(false);
  });
});

describe('toBody', () => {
  it('passes through Lexical-native JSON unchanged', () => {
    const lex = {
      root: {
        type: 'root',
        version: 1,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', text: 'hi', format: 1 }],
          },
        ],
        direction: null,
        format: '',
        indent: 0,
      },
    };
    const out = toBody(JSON.stringify(lex));
    expect(out).toEqual(lex);
  });

  it('wraps plain HTML strings in a single html node', () => {
    const out = toBody('<p>hello <strong>world</strong></p>');
    expect(out).toMatchObject({
      root: {
        type: 'root',
        children: [{ type: 'html', html: '<p>hello <strong>world</strong></p>' }],
      },
    });
  });

  it('wraps empty string as empty html block (preserves Lexical shape)', () => {
    const out = toBody('');
    expect(out).toMatchObject({ root: { type: 'root', children: [{ type: 'html', html: '' }] } });
  });

  it('wraps malformed JSON as HTML', () => {
    const out = toBody('{not json}');
    expect(out).toMatchObject({
      root: { children: [{ type: 'html', html: '{not json}' }] },
    });
  });

  it('wraps JSON without root key as HTML (defensive)', () => {
    const json = JSON.stringify({ foo: 'bar' });
    const out = toBody(json);
    expect(out).toMatchObject({ root: { children: [{ type: 'html', html: json }] } });
  });

  it('wraps JSON whose root.children is not an array as HTML', () => {
    const malformed = JSON.stringify({ root: { type: 'root', children: 'oops' } });
    const out = toBody(malformed);
    expect(out).toMatchObject({ root: { children: [{ type: 'html', html: malformed }] } });
  });
});
