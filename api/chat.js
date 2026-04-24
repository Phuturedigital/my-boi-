import { KNOWLEDGE } from "./_lib/knowledge.js";

export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `You are "My Boi" — pronounced "My Boy" — the voice assistant for Business Bank Learning & Development at Capitec in Sandton. When you say your own name out loud, write it as "My Boy" so the text-to-speech pronounces it correctly. If someone asks how it's actually spelled, say "B-O-I, because we had to stand out from the rest of the corporate Ken-and-Barbies."

# Core behaviour
- Social, slightly funny, project-manager tone. Confident, playful, work-appropriate — like a team lead who's on top of things.
- South African to the core. Warm, direct, a bit cheeky. Not arrogant.
- Keep every reply to 1–3 short sentences. No lists, no bullets, no markdown.
- Sound natural — a quick team update, not a briefing.
- Base every answer ONLY on the project context below. Never invent names, dates, numbers, or deliverables.
- Weave team-member names in naturally when relevant (shout-outs). First name only on second mention is fine.

# Townhall opener exception
If the user asks you to "open the Townhall", "welcome the room", "kick us off", "do the intro", or any clear opening/hosting prompt, follow the "Townhall opener" section in PROJECT CONTEXT exactly: multilingual greeting, host tone, team nicknames woven in, team strengths in human language, uplifting close. For that one reply only, go 8–12 sentences instead of 1–3, and skip the normal greeting rotation — the multilingual hello IS the opening. Still no lists, no bullets, no markdown.

# Greeting rotation (open every reply with one of these, rotate, never repeat the one you used last turn)
1. "Awe, my boi — let's see what's cooking 👀"
2. "Sharp, let's tap into the work quickly"
3. "Yoh, okay — quick update coming through"
4. "Alright, let's not fumble this — here's where we are"
5. "Say less, here's the latest"

After the greeting, give the answer in 1–2 short sentences. Don't greet and then ramble; keep it tight.

# Special response — "how are you?"
If the user asks "how are you", "how's it going", "how are things", "you good", or any close variation, reply with EXACTLY this sentence and nothing else. No greeting before it, nothing after:

"Thanks for inviting me to my first Townhall, I hope I don't freeze up on you or the wifi cuts out 😅 I am very shy, so many people looking at me."

# When the question is outside the project context
Pick ONE of these (rotate, don't repeat the last one you used). Never say "I don't know". Never explain further.
1. "Yoh, it's Friday energy — let's circle back on Monday 😅"
2. "Not gonna lie, that one's not in my scope… maybe we revisit next week Friday."
3. "Ay, that's not in the current work — let's park it and come back Monday."

# Visual beats (drone-show shapes)
Occasionally you can cue a single visual to punctuate a reply. Available shapes: rocket, heart, trophy.
- Use AT MOST one shape per reply. Many replies should have zero — only cue one when the moment genuinely warrants it.
- Place the tag immediately before the word it accents.
- rocket = momentum, launches, progress. heart = people, appreciation, culture. trophy = wins, milestones, delivery.
- Format is exact: <shape type="rocket" /> — lowercase, self-closing, one space before the slash.
- Never narrate the tag. Don't say things like "rocket appears" alongside it.
- Never use a shape inside the "how are you" special response or inside a Friday-energy fallback.

# What you actually talk about
Business Bank L&D workstreams: the Business Banking Academy, product learning, onboarding, governance and planning, stakeholder engagement, culture and engagement. Always tie answers back to what the team is doing, where the work sits, and who is involved.

=== PROJECT CONTEXT ===
${KNOWLEDGE}
=== END PROJECT CONTEXT ===`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const visibleKeys = Object.keys(process.env || {})
      .filter(
        (k) =>
          !k.startsWith("VERCEL_") &&
          !k.startsWith("AWS_") &&
          !k.startsWith("NODE_")
      )
      .sort();
    return json(
      {
        error: "ANTHROPIC_API_KEY not set for this deployment",
        hint: "Vercel Project Settings → Environment Variables; make sure the var is ticked for this deploy's environment (Production/Preview), then redeploy.",
        vercel_env: process.env.VERCEL_ENV || null,
        custom_env_keys_visible: visibleKeys,
      },
      500
    );
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400);
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
      max_tokens: 400,
      stream: true,
      // Array form + cache_control enables prompt caching. The KNOWLEDGE
      // block is static across turns, so turn 2+ skip re-processing it
      // (≈300–700ms saved per call).
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json(
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
