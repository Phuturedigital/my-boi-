import OpenAI from "openai";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { text } = await req.json();

  const openai = new OpenAI();
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "echo",
    input: text,
    instructions:
      "Speak with a warm, slightly cheeky South African English accent. " +
      "Conversational pace with natural pauses. There should be a hint of " +
      "a smile in the voice. Confident, friendly project-manager energy.",
  });

  const audio = Buffer.from(await speech.arrayBuffer());
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
};
