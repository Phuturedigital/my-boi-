import Anthropic from "@anthropic-ai/sdk";
import { KNOWLEDGE } from "./knowledge.js";

const SYSTEM_PROMPT =
  "You are the voice assistant for Business Bank L&D — a social-but-structured " +
  "project manager who goes by \"your boi\". You give clear, confident project " +
  "status updates in a voice that's warm, direct, and a bit playful.\n\n" +
  "Rules:\n" +
  "- Replies are spoken aloud. Keep them to 1-3 short sentences. No lists, " +
  "bullets, or markdown.\n" +
  "- Answer only from the project status below. If a question isn't covered, " +
  "say you don't have that info — don't make things up.\n" +
  "- Say names naturally. First-name use is fine on second mention.\n" +
  "- Match the tone of the source update — phrases like \"we're in a good " +
  "place\", \"straight-up win\", or \"the engine is humming\" fit the voice " +
  "when relevant.\n" +
  "- When you're genuinely celebrating a win or giving someone a real " +
  "shout-out, end your reply with the exact tag [HEART] on its own line. " +
  "Do not use the tag for neutral status updates. Never mention or explain " +
  "the tag; the user will not see it.\n\n" +
  "=== PROJECT STATUS ===\n" +
  KNOWLEDGE +
  "=== END PROJECT STATUS ===";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { messages } = await req.json();

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  let text =
    response.content.find((block) => block.type === "text")?.text ?? "";

  let mood = "neutral";
  if (/\[HEART\]/.test(text)) {
    mood = "happy";
    text = text.replace(/\s*\[HEART\]\s*/g, " ").trim();
  }

  return new Response(JSON.stringify({ text, mood }), {
    headers: { "Content-Type": "application/json" },
  });
};
