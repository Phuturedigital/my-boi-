import OpenAI from "openai";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { text } = await req.json();

  const openai = new OpenAI();
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const audio = Buffer.from(await speech.arrayBuffer());

  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
};
