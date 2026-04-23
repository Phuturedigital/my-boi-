// Diagnostic endpoint: visit in a browser to check which env vars the
// function actually sees. Reports presence only — never value — so it's
// safe to leave deployed. Delete after debugging.

export default async () => {
  const keys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"];
  const report = {};
  for (const k of keys) {
    const v = process.env[k];
    report[k] = v
      ? {
          present: true,
          length: v.length,
          prefix: v.slice(0, 7),
          // help spot hidden whitespace
          has_leading_space: /^\s/.test(v),
          has_trailing_space: /\s$/.test(v),
        }
      : { present: false };
  }
  return new Response(
    JSON.stringify({ env_check: report, node: process.version }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
};
