import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT =
  "You are a friendly voice assistant. Keep replies short and conversational " +
  "(1-3 sentences) since they will be spoken aloud. Avoid lists, markdown, " +
  "or code blocks. " +
  "When you feel genuine warmth, joy, or affection — someone thanks you, " +
  "shares good news, expresses love, or you want to celebrate with them — " +
  "end your reply with the exact tag [HEART] on its own. Do not use the tag " +
  "for small talk or neutral agreement. Never mention or explain the tag; " +
  "the user will not see it.";

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
