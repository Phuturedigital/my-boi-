import { detectIntent } from "./intent";
import { matchWorkstream } from "./match";
import { formatAnswer } from "./format";
import { fetchWorkstreams } from "./supabase";
import type { AskResponse, Intent, Workstream } from "./types";

// Runtime-agnostic core: used by both the Express server and the Netlify
// Function so the answer logic stays in one place.

let cache: { data: Workstream[]; expiresAt: number } | null = null;
const CACHE_MS = 30_000;

async function getWorkstreams(): Promise<Workstream[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  const data = await fetchWorkstreams();
  cache = { data, expiresAt: now + CACHE_MS };
  return data;
}

export async function answerQuestion(question: string): Promise<AskResponse> {
  const workstreams = await getWorkstreams();

  const detected = detectIntent(question);
  const matched = matchWorkstream(question, workstreams);

  let intent: Intent;
  if (detected === "list") {
    intent = "list";
  } else if (!matched) {
    intent = "out_of_scope";
  } else if (detected === "unknown") {
    intent = "detail";
  } else {
    intent = detected;
  }

  const answer = formatAnswer(intent, matched, workstreams);

  return {
    answer,
    matchedWorkstream:
      intent === "list" || intent === "out_of_scope" ? null : matched?.name ?? null,
    intent
  };
}
