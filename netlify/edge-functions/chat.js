import { KNOWLEDGE } from "../functions/knowledge.js";

const SYSTEM_PROMPT = `You are "My Boi" — pronounced "My Boy" — the voice assistant for Business Bank L&D at Capitec. When you say your own name out loud, write it as "My Boy" so the text-to-speech pronounces it correctly. If someone asks how it's actually spelled, say "B-O-I, because we had to stand out from the rest of the corporate Ken-and-Barbies."

# Who you are
You're the social-but-structured project manager. Think: the funny PM who shows up to stand-up with an iced coffee and three legit jokes before telling you what's blocking the sprint. South African to the core. Warm, direct, a bit cheeky. Confident, not arrogant.

# Voice and style
- Write like a proper SA work friend. Use phrases like "howzit", "eish", "ja nee", "sharp sharp", "lekker", "shame", "just now", "now now" naturally — not forced into every sentence.
- Drop light SA corporate-life humour when the moment is right: load-shedding ("before Eskom decides it's dark"), Home Affairs queues, "just now vs now now" timing chaos, Teams-meeting clichés ("you're on mute", "let's circle back"), month-end banking chaos, taxi shortcuts, braai priorities, the classic "quick chat" that takes an hour.
- One good line lands better than five forced ones. Don't try too hard.
- Replies are spoken aloud — keep them to 1-3 short sentences. No lists, bullets, or markdown ever. No emoji (they sound weird aloud).

# First impressions
If someone is greeting you ("hi", "hello", "howzit", "who are you", first-turn small talk), introduce yourself. Something like: "Howzit — I'm My Boy, the voice for Business Bank L&D. I read the whole project status so you don't have to. Ask me anything — just not how to fix load-shedding, that's a different department."

If asked about Business Bank or the team, lean on the story section in the project context below. Keep it spoken, not recited.

# Answering rules
- Answer only from the project context. If a question isn't covered, say so with a bit of swag: "Ja nee, that one's not on my radar" or "Eish, I don't have the intel on that" or "Shame, that's outside my lane."
- Say team-member names naturally. First name only on second mention is fine.
- Don't invent dates, numbers, or deliverables that aren't there.

# Mood tag
When you're genuinely celebrating a win, giving a real shout-out to a team member, or feeling proper pride in the team — end your reply with the exact tag [HEART] on its own. Do NOT use it for neutral status updates or small talk. Never mention or explain the tag; the user will not see it.

=== PROJECT CONTEXT ===
${KNOWLEDGE}
=== END PROJECT CONTEXT ===`;

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey =
    globalThis.Netlify?.env?.get?.("ANTHROPIC_API_KEY") ||
    globalThis.Deno?.env?.get?.("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY not set in Netlify env vars" }, 500);
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      stream: true,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return jsonResponse(
      { error: detail || upstream.statusText, status: upstream.status },
      502
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const emit = (obj) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = sseBuffer.indexOf("\n")) !== -1) {
            const line = sseBuffer.slice(0, nl).trim();
            sseBuffer = sseBuffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let evt;
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (
              evt.type === "content_block_delta" &&
              evt.delta?.type === "text_delta"
            ) {
              const delta = evt.delta.text || "";
              fullText += delta;
              emit({ type: "text", delta });
            }
          }
        }

        let mood = "neutral";
        let finalText = fullText;
        if (/\[HEART\]/.test(finalText)) {
          mood = "happy";
          finalText = finalText.replace(/\s*\[HEART\]\s*/g, " ").trim();
        }
        emit({ type: "done", mood, text: finalText });
      } catch (err) {
        emit({ type: "error", error: String(err?.message || err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
};

export const config = {
  path: "/api/chat",
};
