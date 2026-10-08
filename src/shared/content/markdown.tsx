/**
 * A small, safe Markdown renderer for content files. It never inserts raw HTML.
 *
 * Supported:
 *   blank line         new paragraph
 *   - item / 1. item   lists
 *   **bold**, *italic*
 *   [[term]]           glossary term (tap to see its meaning)
 *   [[shown words|term]]  glossary term with different shown words
 *   ^HL^               an HL label
 *   H~2~O style subscripts are not needed: type D₁, S₂ directly.
 */
import { ComponentChildren, Fragment } from 'preact';
import { GlossaryTerm } from './Glossary';
import { HlBadge } from '../design/components';

export function Md({ text, inline }: { text: string; inline?: boolean }) {
  if (inline) return <>{renderInline(text)}</>;
  const blocks = text.replace(/\r/g, '').trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-*] /.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\s*[-*] /, ''))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\s*\d+\. /.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\s*\d+\. /, ''))}</li>)}</ol>;
        }
        const h = /^(#{2,4}) (.*)$/.exec(block);
        if (h && lines.length === 1) {
          const Tag = (`h${h[1].length + 1}` as 'h3');
          return <Tag key={i}>{renderInline(h[2])}</Tag>;
        }
        return <p key={i}>{renderInline(lines.join(' '))}</p>;
      })}
    </>
  );
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\]|\^HL\^)/g;

export function renderInline(text: string): ComponentChildren {
  const parts = text.split(TOKEN).filter((p) => p !== '');
  return parts.map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('[[')) {
      const inner = part.slice(2, -2);
      const [shown, term] = inner.includes('|') ? inner.split('|') : [inner, inner];
      return <GlossaryTerm key={i} term={term.trim()} shown={shown.trim()} />;
    }
    if (part === '^HL^') return <HlBadge key={i} />;
    if (part.startsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
