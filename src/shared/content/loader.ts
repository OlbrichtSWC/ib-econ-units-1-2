/**
 * Content loading. All words students read (explanations, questions, hints, feedback,
 * event cards, glossary) live in files under public/content/, so a teacher can edit
 * them without touching code. Files are fetched once and kept in memory.
 * Once the app has been opened online, the offline cache serves them with no internet.
 */
const cache = new Map<string, Promise<unknown>>();

/** Path relative to the site root, for example "content/glossary.json". */
export function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export function loadText(path: string): Promise<string> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${path} (${r.status})`);
        return r.text();
      }),
    );
  }
  return cache.get(path) as Promise<string>;
}

/** For tests or after a teacher edits content in the same session. */
export function clearContentCache() {
  cache.clear();
}
