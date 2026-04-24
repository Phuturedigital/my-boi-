export const config = { runtime: "edge" };

// Lists Vercel-auto vars and custom vars separately so we can tell
// "no env at all" from "env exists but missing our keys".
const SYSTEM_PREFIXES = ["VERCEL_", "AWS_", "NODE_", "NX_", "NEXT_"];
const isSystem = (k) => SYSTEM_PREFIXES.some((p) => k.startsWith(p));

export default async () => {
  const expected = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"];
  const report = {};
  for (const k of expected) {
    const v = process.env[k];
    report[k] = v
      ? {
          present: true,
          length: v.length,
          prefix: v.slice(0, 7),
          has_leading_space: /^\s/.test(v),
          has_trailing_space: /\s$/.test(v),
          has_quotes: v.startsWith('"') || v.startsWith("'"),
        }
      : { present: false };
  }

  const allKeys = Object.keys(process.env || {}).sort();
  const customKeys = allKeys.filter((k) => !isSystem(k));
  const systemKeyCount = allKeys.length - customKeys.length;

  return new Response(
    JSON.stringify(
      {
        runtime: "vercel-edge",
        vercel_env: process.env.VERCEL_ENV || null,
        vercel_region: process.env.VERCEL_REGION || null,
        expected: report,
        custom_env_keys_visible: customKeys,
        system_env_keys_count: systemKeyCount,
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json" } }
  );
};
