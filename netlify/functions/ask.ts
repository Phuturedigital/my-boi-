import type { Handler } from "@netlify/functions";
import { answerQuestion } from "../../server/answer";

// Serverless entry for POST /api/ask on Netlify.
// `netlify.toml` rewrites /api/ask → /.netlify/functions/ask so the frontend
// can keep calling the same relative URL it uses in local Express dev.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let parsed: { question?: unknown };
  try {
    parsed = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const question = parsed.question;
  if (typeof question !== "string" || !question.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "question is required" }) };
  }

  try {
    const body = await answerQuestion(question);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Failed to load knowledge base: ${message}` })
    };
  }
};
