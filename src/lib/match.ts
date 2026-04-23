type Matchable = {
  slug: string;
  name: string;
  aliases: string[];
};

// Matches a question to the best workstream by scanning slug, name and aliases.
// The longest matching token wins so "product learning delivery" beats "products".
export function matchWorkstream<T extends Matchable>(
  question: string,
  workstreams: T[]
): T | null {
  const q = question.toLowerCase();
  let best: { ws: T; score: number } | null = null;

  for (const ws of workstreams) {
    const candidates = [
      ws.slug.toLowerCase().replace(/-/g, ' '),
      ws.name.toLowerCase(),
      ...ws.aliases.map((a) => a.toLowerCase()),
    ];

    for (const token of candidates) {
      if (!token) continue;
      if (q.includes(token)) {
        const score = token.length;
        if (!best || score > best.score) best = { ws, score };
      }
    }
  }

  return best?.ws ?? null;
}
