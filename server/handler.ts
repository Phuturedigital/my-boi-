import type { Request, Response } from "express";
import type { AskRequest, AskResponse, Intent, Workstream } from "./types";
import { detectIntent } from "./intent";
import { matchWorkstream } from "./match";
import { formatAnswer } from "./format";
import { fetchWorkstreams } from "./supabase";

// Cache workstreams briefly so repeated asks don't hammer Supabase.
let cache: { data: Workstream[]; expiresAt: number } | null = null;
const CACHE_MS = 30_000;

async function getWorkstreams(): Promise<Workstream[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  const data = await fetchWorkstreams();
  cache = { data, expiresAt: now + CACHE_MS };
  return data;
}

export async function handleAsk(req: Request, res: Response): Promise<void> {
  const { question } = (req.body ?? {}) as Partial<AskRequest>;

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  let workstreams: Workstream[];
  try {
    workstreams = await getWorkstreams();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to load knowledge base: ${message}` });
    return;
  }

  const detected = detectIntent(question);
  const matched = matchWorkstream(question, workstreams);

  let intent: Intent;
  if (detected === "list") {
    intent = "list";
  } else if (!matched) {
    // Nothing in our KB resembles the question → hard out-of-scope.
    intent = "out_of_scope";
  } else if (detected === "unknown") {
    // Workstream matched but intent ambiguous — default to detail.
    intent = "detail";
  } else {
    intent = detected;
  }

  const answer = formatAnswer(intent, matched, workstreams);

  const body: AskResponse = {
    answer,
    matchedWorkstream: intent === "list" || intent === "out_of_scope" ? null : matched?.name ?? null,
    intent
  };

  res.json(body);
}
