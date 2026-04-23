import type { Intent } from "./types";

// Deterministic, phrase-first intent detection. Order matters: more specific
// phrases are checked first so e.g. "who should I shout out" doesn't leak
// into the "who" branch.
export function detectIntent(rawQuestion: string): Intent | "unknown" {
  const q = rawQuestion.toLowerCase().trim();

  if (q.includes("who should i shout out") || q.includes("who to shout out") || q.includes("shout out for")) {
    return "shoutout";
  }
  if (q.includes("who owns") || q.includes("owner of") || q.includes("who is responsible for")) {
    return "owner";
  }
  if (q.includes("what are we working on") || q.includes("what are the workstreams") || q.includes("list workstreams")) {
    return "list";
  }
  if (q.includes("high level") || q.includes("tell me about") || q.includes("summarise") || q.includes("summarize")) {
    return "summary";
  }
  if (q.startsWith("what is") || q.includes("what is ") || q.startsWith("what's") || q.includes("describe ")) {
    return "detail";
  }

  return "unknown";
}
