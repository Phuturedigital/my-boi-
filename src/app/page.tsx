'use client';

import { useState } from 'react';
import type { AskResponse } from '@/lib/types';

const CHIPS = [
  'What are we working on?',
  'Who owns BBA?',
  'Who should I shout out for onboarding?',
  'Tell me about product learning',
];

export default function Home() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        const maybe = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(maybe.error ?? 'Request failed');
      }
      const data: AskResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function onChip(chip: string) {
    setQuestion(chip);
    ask(chip);
  }

  return (
    <main className="page">
      <header className="header">
        <h1>my boi</h1>
        <p>Internal Business Bank L&amp;D assistant</p>
      </header>

      <div className="ask">
        <input
          className="input"
          placeholder="Ask my boi about the work..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ask(question);
          }}
          aria-label="Ask a question"
        />
        <button
          className="button"
          onClick={() => ask(question)}
          disabled={loading}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      <div className="chips">
        {CHIPS.map((chip) => (
          <button key={chip} className="chip" onClick={() => onChip(chip)}>
            {chip}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <article className="card" aria-live="polite">
          <div className="badges">
            <span className="badge intent">{result.intent.replace('_', ' ')}</span>
            {result.matchedWorkstream && (
              <span className="badge match">{result.matchedWorkstream}</span>
            )}
          </div>
          <pre className="answer">{result.answer}</pre>
        </article>
      )}

      {!result && !loading && !error && (
        <div className="empty">
          Try one of the examples above, or ask about a workstream.
        </div>
      )}
    </main>
  );
}
