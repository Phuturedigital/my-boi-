// Diagnostic for Edge Functions. Reports presence only — never value.
// Visit /api/env-check in a browser. Delete after debugging.

export default async () => {
  const keys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"];
  const report = {};
  for (const k of keys) {
    const viaNetlify = globalThis.Netlify?.env?.get?.(k);
    const viaDeno = globalThis.Deno?.env?.get?.(k);
    const v = viaNetlify || viaDeno;
    report[k] = v
      ? {
          present: true,
          length: v.length,
          prefix: v.slice(0, 7),
          via_netlify_env: !!viaNetlify,
          via_deno_env: !!viaDeno,
          has_leading_space: /^\s/.test(v),
          has_trailing_space: /\s$/.test(v),
        }
      : {
          present: false,
          via_netlify_env: false,
          via_deno_env: false,
        };
  }
  return new Response(
    JSON.stringify(
      {
        runtime: "edge",
        env_check: report,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
};

export const config = {
  path: "/api/env-check",
};
