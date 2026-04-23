export type Intent =
  | 'owner'
  | 'summary'
  | 'shoutout'
  | 'list'
  | 'detail'
  | 'out_of_scope';

export type TeamMember = {
  id: string;
  full_name: string;
};

export type Workstream = {
  id: string;
  slug: string;
  name: string;
  description: string;
  what_is_being_done: string[];
  owner_member_id: string | null;
  aliases: string[];
};

export type WorkstreamWithRelations = Workstream & {
  owner: TeamMember | null;
  team: TeamMember[];
};

export type AskRequest = {
  question: string;
};

export type AskResponse = {
  answer: string;
  matchedWorkstream: string | null;
  intent: Intent;
};
