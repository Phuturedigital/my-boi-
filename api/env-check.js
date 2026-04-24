export const config = { runtime: "edge" };

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
          has_leading_space: /^\s/.test(v),
          has_trailing_space: /\s$/.test(v),
        }
      : { present: false };
  }
  return new Response(
    JSON.stringify({ runtime: "vercel-edge", env_check: report }, null, 2),
    { headers: { "Content-Type": "application/json" } }
  );
};
