# Content

`loader.ts` fetches JSON or text files from the site (cached in memory, and by the offline service worker).
`markdown.tsx` is a small safe Markdown renderer (bold, italic, lists, `[[glossary term]]`, `^HL^`). It never inserts raw HTML.
`Glossary.tsx` loads `content/glossary.json` and renders tappable terms.
