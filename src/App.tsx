import { useState } from "react";
import { ask } from "./api";
import type { AskResponse, Intent } from "./types";

const EXAMPLE_CHIPS: string[] = [
  "What are we working on?",
  "Who owns BBA?",
  "Who should I shout out for onboarding?",
  "Tell me about product learning"
];

const INTENT_LABEL: Record<Intent, string> = {
  list: "Workstreams",
  owner: "Owner",
  shoutout: "Shout-out",
  detail: "Detail",
  summary: "Summary",
  out_of_scope: "Out of scope"
};

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ask(trimmed);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function onChipClick(chip: string) {
    setQuestion(chip);
    void submit(chip);
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">my boi</h1>
        <p className="subtitle">Internal Business Bank L&amp;D assistant</p>
      </header>

      <main className="main">
        <form
          className="ask"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(question);
          }}
        >
          <input
            className="ask-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask my boi about the work..."
            aria-label="Ask my boi"
            autoFocus
          />
          <button className="ask-button" type="submit" disabled={loading || !question.trim()}>
            {loading ? "Thinking…" : "Ask"}
          </button>
        </form>

        <div className="chips" role="list">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="chip"
              onClick={() => onChipClick(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>

        {error && <div className="card card-error">{error}</div>}

        {!result && !error && !loading && (
          <div className="card card-empty">
            <p className="empty-title">Ask about a workstream, owner, or team.</p>
            <ul className="empty-list">
              <li>What are we working on?</li>
              <li>Who owns Governance &amp; Planning?</li>
              <li>Who should I shout out for onboarding?</li>
              <li>Tell me about product learning at a high level</li>
            </ul>
          </div>
        )}

        {result && (
          <article className="card card-result">
            <div className="badges">
              <span className={`badge badge-intent badge-${result.intent}`}>
                {INTENT_LABEL[result.intent]}
              </span>
              {result.matchedWorkstream && (
                <span className="badge badge-workstream">{result.matchedWorkstream}</span>
              )}
            </div>
            <pre className="answer">{result.answer}</pre>
          </article>
        )}
      </main>

      <footer className="footer">
        <span>Retrieval-only · answers grounded in the knowledge base</span>
      </footer>
    </div>
  );
}
