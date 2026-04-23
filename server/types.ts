// Shared types for the my boi retrieval assistant.

export type Intent =
  | "list"
  | "owner"
  | "shoutout"
  | "detail"
  | "summary"
  | "out_of_scope";

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
  aliases: string[];
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

// Product Learning product mapping — kept as a code constant per spec.
export const PRODUCT_LEARNING_PRODUCTS = [
  "Debit Card",
  "TPMM / RTC",
  "CPL",
  "VAF / NaTIS",
  "Turnover Validation",
  "Online Banking"
] as const;
