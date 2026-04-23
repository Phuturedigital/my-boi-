import type { Request, Response } from "express";
import type { AskRequest } from "./types";
import { answerQuestion } from "./answer";

export async function handleAsk(req: Request, res: Response): Promise<void> {
  const { question } = (req.body ?? {}) as Partial<AskRequest>;

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  try {
    const body = await answerQuestion(question);
    res.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to load knowledge base: ${message}` });
  }
}
