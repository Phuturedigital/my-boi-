import OpenAI from "openai";

export default async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OPENAI_API_KEY not set in Vercel env vars" });
    return;
  }

  const { text } = req.body || {};
  if (!text) {
    res.status(400).json({ error: "missing text" });
    return;
  }

  try {
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
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(audio);
  } catch (err) {
    console.error("tts error:", err);
    res.status(500).json({
      error: err?.message || "unknown error",
      status: err?.status,
    });
  }
};
