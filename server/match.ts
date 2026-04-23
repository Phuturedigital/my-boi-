import type { Workstream } from "./types";

// Normalise for matching: lowercase + collapse whitespace + strip punctuation
// that isn't part of names (keep & so "business banking academy" matches).
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[?.!,;:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Score a workstream against the question: the length of the longest matching
// token (slug, name, or alias). Longer matches win so "business banking
// academy" beats "academy".
function scoreWorkstream(question: string, ws: Workstream): number {
  const candidates: string[] = [
    ws.slug.replace(/-/g, " "),
    ws.name,
    ...ws.aliases
  ];

  let best = 0;
  for (const c of candidates) {
    const token = normalise(c);
    if (!token) continue;
    if (question.includes(token)) {
      best = Math.max(best, token.length);
    }
  }
  return best;
}

// Returns the best-matching workstream, or null when nothing matches.
export function matchWorkstream(
  rawQuestion: string,
  workstreams: Workstream[]
): Workstream | null {
  const q = normalise(rawQuestion);
  let best: Workstream | null = null;
  let bestScore = 0;

  for (const ws of workstreams) {
    const score = scoreWorkstream(q, ws);
    if (score > bestScore) {
      bestScore = score;
      best = ws;
    }
  }

  return best;
}
