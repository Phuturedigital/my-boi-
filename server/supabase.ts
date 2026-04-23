import { createClient } from "@supabase/supabase-js";
import type { Workstream } from "./types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  // We don't throw at import-time so the dev server can still boot and
  // surface a helpful error in the API response, but we warn loudly.
  console.warn(
    "[my boi] SUPABASE_URL / SUPABASE_ANON_KEY not set — /api/ask will 500 until they are configured in .env"
  );
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: { persistSession: false }
});

// Typed row shapes returned by the join query below.
type WorkstreamRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  what_is_being_done: string[];
  aliases: string[] | null;
  owner: { id: string; full_name: string } | null;
  workstream_team_members: Array<{
    member: { id: string; full_name: string } | null;
  }>;
};

// Fetches every workstream with its owner and assigned team in one round-trip.
export async function fetchWorkstreams(): Promise<Workstream[]> {
  const { data, error } = await supabase
    .from("workstreams")
    .select(
      `
      id, slug, name, description, what_is_being_done, aliases,
      owner:team_members!workstreams_owner_member_id_fkey(id, full_name),
      workstream_team_members(
        member:team_members(id, full_name)
      )
    `
    )
    .order("name", { ascending: true })
    .returns<WorkstreamRow[]>();

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    what_is_being_done: row.what_is_being_done ?? [],
    aliases: row.aliases ?? [],
    owner: row.owner,
    team: row.workstream_team_members
      .map((j) => j.member)
      .filter((m): m is { id: string; full_name: string } => !!m)
  }));
}
