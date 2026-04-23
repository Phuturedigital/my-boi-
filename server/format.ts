import type { Intent, Workstream } from "./types";

// Dedupe team members by id, preserving order, and drop the owner so the
// shoutout output never lists the owner twice.
function uniqueTeamExcludingOwner(ws: Workstream): string[] {
  const seen = new Set<string>();
  if (ws.owner) seen.add(ws.owner.id);
  const out: string[] = [];
  for (const m of ws.team) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m.full_name);
  }
  return out;
}

// Human-friendly list joiner: "a, b and c" for summary prose.
function prettyJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

export function formatAnswer(
  intent: Intent,
  workstream: Workstream | null,
  allWorkstreams: Workstream[]
): string {
  if (intent === "out_of_scope") {
    return "Not in current scope.";
  }

  if (intent === "list") {
    return allWorkstreams.map((w) => w.name).join("\n");
  }

  if (!workstream) {
    return "Not in current scope.";
  }

  const ownerName = workstream.owner?.full_name ?? "Unassigned";

  if (intent === "owner") {
    return ownerName;
  }

  if (intent === "shoutout") {
    const team = uniqueTeamExcludingOwner(workstream);
    return [ownerName, ...team].join("\n");
  }

  if (intent === "detail") {
    const team = workstream.team.map((m) => m.full_name).join(", ") || "—";
    return [
      `What it is: ${workstream.description}`,
      `What is being done:`,
      ...workstream.what_is_being_done.map((w) => `- ${w}`),
      `Owner: ${ownerName}`,
      `Team: ${team}`
    ].join("\n");
  }

  if (intent === "summary") {
    const focus = workstream.description.replace(/\.$/, "");
    const doing = prettyJoin(workstream.what_is_being_done);
    return `${workstream.name} is focused on ${focus}. Current work includes ${doing}. Owner: ${ownerName}`;
  }

  return "Not in current scope.";
}
