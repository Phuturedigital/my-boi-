import { supabase } from './supabase';
import { WorkstreamWithRelations } from './types';

type RawRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  what_is_being_done: string[];
  owner_member_id: string | null;
  aliases: string[] | null;
  owner: { id: string; full_name: string } | null;
  workstream_team_members:
    | { member: { id: string; full_name: string } | null }[]
    | null;
};

// Loads every workstream with its owner and team members in a single query.
export async function loadWorkstreams(): Promise<WorkstreamWithRelations[]> {
  const { data, error } = await supabase
    .from('workstreams')
    .select(
      `
        id, slug, name, description, what_is_being_done, owner_member_id, aliases,
        owner:team_members!owner_member_id(id, full_name),
        workstream_team_members(member:team_members(id, full_name))
      `
    )
    .order('name', { ascending: true })
    .returns<RawRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    what_is_being_done: row.what_is_being_done,
    owner_member_id: row.owner_member_id,
    aliases: row.aliases ?? [],
    owner: row.owner,
    team: (row.workstream_team_members ?? [])
      .map((r) => r.member)
      .filter((m): m is { id: string; full_name: string } => m !== null),
  }));
}
