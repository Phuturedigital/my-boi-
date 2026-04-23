import { Intent } from './types';

// Deterministic phrase matching. Order matters - more specific phrases first.
export function detectIntent(question: string): Intent {
  const q = question.toLowerCase().trim();

  if (q.includes('what are we working on')) return 'list';
  if (q.includes('who should i shout out') || q.includes('who to shout out')) return 'shoutout';
  if (q.includes('who owns')) return 'owner';
  if (q.includes('high level') || q.includes('tell me about')) return 'summary';
  if (q.includes('what is') || q.includes("what's")) return 'detail';

  // Light keyword fallback - stays strict.
  if (q.includes('owner')) return 'owner';
  if (q.includes('shout out') || q.includes('team')) return 'shoutout';
  if (q.includes('summary') || q.includes('overview')) return 'summary';

  return 'detail';
}
