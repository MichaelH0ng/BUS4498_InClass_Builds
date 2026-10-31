-- Stage 13: lessons (what moderators teach the agent)
-- Signed-in moderators write one-sentence lessons. The agent loads every active lesson before each decision.
-- A lesson can make a post wait. It can never publish a post the rules would hold, and the agent never writes one.

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lesson text not null check (char_length(lesson) between 5 and 300),
  active boolean not null default true,
  created_by text not null default '',
  from_post uuid
);

alter table public.lessons enable row level security;

-- Start from nothing: visitors get no access at all.
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;
grant insert (lesson, created_by, from_post) on public.lessons to authenticated;
grant update (active) on public.lessons to authenticated;
grant all on public.lessons to service_role;

create policy "Moderators can read lessons"
  on public.lessons for select to authenticated using (true);
create policy "Moderators can add lessons"
  on public.lessons for insert to authenticated with check (true);
create policy "Moderators can switch lessons on and off"
  on public.lessons for update to authenticated using (true) with check (true);

-- Which lessons the agent followed for each post.
alter table public.events add column if not exists lessons_used text[] not null default '{}';
