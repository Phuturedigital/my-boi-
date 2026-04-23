// Mirror of the server's public API response shape.

export type Intent =
  | "list"
  | "owner"
  | "shoutout"
  | "detail"
  | "summary"
  | "out_of_scope";

export type AskResponse = {
  answer: string;
  matchedWorkstream: string | null;
  intent: Intent;
};
