import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT =
  "You are a friendly voice assistant. Keep replies short and conversational " +
  "(1-3 sentences) since they will be spoken aloud. Avoid lists, markdown, " +
  "or code blocks.";

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

  const text =
    response.content.find((block) => block.type === "text")?.text ?? "";

  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
};
