-- my boi — Supabase schema + seed
-- Run this file once in the Supabase SQL editor (or via psql) against a fresh project.
-- It is idempotent: safe to re-run, it will upsert the seed rows.

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Tables ----------
create table if not exists team_members (
  id        uuid primary key default gen_random_uuid(),
  full_name text not null unique
);

create table if not exists workstreams (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  description        text not null,
  what_is_being_done text[] not null,
  owner_member_id    uuid references team_members(id),
  aliases            text[] not null default '{}'
);

create table if not exists workstream_team_members (
  id            uuid primary key default gen_random_uuid(),
  workstream_id uuid not null references workstreams(id) on delete cascade,
  member_id     uuid not null references team_members(id) on delete cascade,
  unique (workstream_id, member_id)
);

-- ---------- Read-only policies (anon can read) ----------
alter table team_members            enable row level security;
alter table workstreams             enable row level security;
alter table workstream_team_members enable row level security;

drop policy if exists "read team_members"            on team_members;
drop policy if exists "read workstreams"             on workstreams;
drop policy if exists "read workstream_team_members" on workstream_team_members;

create policy "read team_members"            on team_members            for select using (true);
create policy "read workstreams"             on workstreams             for select using (true);
create policy "read workstream_team_members" on workstream_team_members for select using (true);

-- ---------- Seed: team_members ----------
insert into team_members (full_name) values
  ('Silindile Hlengwa'),
  ('Nomthi Mthiyane'),
  ('Tlotliso Mosiana'),
  ('Leroy Februarie'),
  ('Simangele Khumalo'),
  ('Mfumo Ngobeni'),
  ('Lebo Setshedi')
on conflict (full_name) do nothing;

-- ---------- Seed: workstreams ----------
insert into workstreams (slug, name, description, what_is_being_done, owner_member_id, aliases) values
  (
    'loop-knowledge-management',
    'Loop & Knowledge Management',
    'Central system for planning, tracking, and knowledge management.',
    array[
      'Creating and maintaining Loop workspaces',
      'Tracking delivery, agendas, notes, follow-ups',
      'Linking Loop to OneDrive assets'
    ],
    (select id from team_members where full_name = 'Tlotliso Mosiana'),
    array['loop','knowledge management','loop ownership']
  ),
  (
    'business-banking-academy',
    'Business Banking Academy',
    'Structured learning ecosystem for Business Banking.',
    array[
      'Building full learning programmes',
      'Standardising asset sets per product',
      'Coordinating delivery across products',
      'Tracking via dashboards and Loop'
    ],
    (select id from team_members where full_name = 'Silindile Hlengwa'),
    array['bba','academy','business banking academy']
  ),
  (
    'product-learning',
    'Product Learning',
    'Learning delivery across Business Banking products.',
    array[
      'Scoping full learning suites',
      'Managing SME engagement and feedback',
      'Ensuring accuracy and learner experience'
    ],
    (select id from team_members where full_name = 'Tlotliso Mosiana'),
    array['product learning delivery','product learning','products']
  ),
  (
    'debit-card-learning',
    'Debit Card Learning',
    'Programme-level delivery model for product learning.',
    array[
      'Tracking all learning assets',
      'Managing timelines and SME input',
      'Using Loop for coordination'
    ],
    (select id from team_members where full_name = 'Tlotliso Mosiana'),
    array['debit card','debit card learning']
  ),
  (
    'onboarding-foundation-learning',
    'Onboarding & Foundation Learning',
    'Learning for new joiners and foundational capability.',
    array[
      'Divisional onboarding',
      'Technical onboarding',
      'Distribution onboarding',
      'Updating learning platforms'
    ],
    (select id from team_members where full_name = 'Simangele Khumalo'),
    array['onboarding','foundation learning','new joiners']
  ),
  (
    'governance-planning',
    'Governance & Planning',
    'Delivery tracking and prioritisation system.',
    array[
      'Maintaining dashboards',
      'Tracking progress and risks',
      'Supporting leadership readiness'
    ],
    (select id from team_members where full_name = 'Leroy Februarie'),
    array['governance','planning','governance and planning']
  ),
  (
    'stakeholder-sme-engagement',
    'Stakeholder & SME Engagement',
    'Managing business alignment and feedback.',
    array[
      'Engaging SMEs',
      'Managing feedback cycles',
      'Supporting approvals and sign-offs'
    ],
    (select id from team_members where full_name = 'Silindile Hlengwa'),
    array['stakeholder engagement','sme engagement','stakeholders']
  ),
  (
    'culture-engagement',
    'Culture & Engagement',
    'Internal engagement and culture initiatives.',
    array[
      'HR ReIgnite initiative',
      'Agenda design and facilitation',
      'Follow-ups and engagement activities'
    ],
    (select id from team_members where full_name = 'Tlotliso Mosiana'),
    array['culture','engagement','hr reignite']
  )
on conflict (slug) do update set
  name               = excluded.name,
  description        = excluded.description,
  what_is_being_done = excluded.what_is_being_done,
  owner_member_id    = excluded.owner_member_id,
  aliases            = excluded.aliases;

-- ---------- Seed: workstream_team_members ----------
-- Helper pattern: insert (workstream slug, member full_name) pairs via lookups.
insert into workstream_team_members (workstream_id, member_id)
select w.id, m.id
from (values
  ('loop-knowledge-management',       'Leroy Februarie'),
  ('loop-knowledge-management',       'Silindile Hlengwa'),
  ('loop-knowledge-management',       'Simangele Khumalo'),
  ('loop-knowledge-management',       'Nomthi Mthiyane'),

  ('business-banking-academy',        'Tlotliso Mosiana'),
  ('business-banking-academy',        'Mfumo Ngobeni'),
  ('business-banking-academy',        'Simangele Khumalo'),
  ('business-banking-academy',        'Nomthi Mthiyane'),

  ('product-learning',                'Mfumo Ngobeni'),
  ('product-learning',                'Simangele Khumalo'),
  ('product-learning',                'Silindile Hlengwa'),
  ('product-learning',                'Nomthi Mthiyane'),

  ('debit-card-learning',             'Mfumo Ngobeni'),
  ('debit-card-learning',             'Simangele Khumalo'),
  ('debit-card-learning',             'Silindile Hlengwa'),
  ('debit-card-learning',             'Nomthi Mthiyane'),

  ('onboarding-foundation-learning',  'Tlotliso Mosiana'),
  ('onboarding-foundation-learning',  'Silindile Hlengwa'),
  ('onboarding-foundation-learning',  'Nomthi Mthiyane'),
  ('onboarding-foundation-learning',  'Leroy Februarie'),

  ('governance-planning',             'Tlotliso Mosiana'),
  ('governance-planning',             'Silindile Hlengwa'),
  ('governance-planning',             'Mfumo Ngobeni'),
  ('governance-planning',             'Lebo Setshedi'),

  ('stakeholder-sme-engagement',      'Tlotliso Mosiana'),
  ('stakeholder-sme-engagement',      'Simangele Khumalo'),
  ('stakeholder-sme-engagement',      'Mfumo Ngobeni'),
  ('stakeholder-sme-engagement',      'Nomthi Mthiyane'),

  ('culture-engagement',              'Silindile Hlengwa'),
  ('culture-engagement',              'Leroy Februarie'),
  ('culture-engagement',              'Nomthi Mthiyane'),
  ('culture-engagement',              'Simangele Khumalo')
) as pair(slug, full_name)
join workstreams  w on w.slug      = pair.slug
join team_members m on m.full_name = pair.full_name
on conflict (workstream_id, member_id) do nothing;
