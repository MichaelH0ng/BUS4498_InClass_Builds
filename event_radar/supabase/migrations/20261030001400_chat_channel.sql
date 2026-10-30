-- Stage 14: read posts from a chat group (GroupMe)
-- 1. Each post remembers which chat message it came from, and the database refuses a second decision on the same message.
-- 2. channel_cursor is the reader's bookmark: the newest message it has already read.
-- 3. A scheduled job (Integrations -> Cron) calls the reader once a minute.

alter table public.events
  add column if not exists source text not null default '',
  add column if not exists source_id text not null default '',
  add column if not exists source_name text not null default '';

-- One decision per chat message, enforced by the database.
create unique index if not exists events_one_per_message
  on public.events (source, source_id)
  where source_id <> '';

-- The reader's bookmark. Only the Edge Functions (service_role) can see or change it.
create table if not exists public.channel_cursor (
  source text primary key,
  last_id text not null default '',
  read_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.channel_cursor enable row level security;
revoke all on public.channel_cursor from anon, authenticated;
grant select, insert, update, delete on public.channel_cursor to service_role;

-- The timer: pg_cron runs the job, pg_net makes the web request to the reader.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Re-running this file replaces the job instead of adding a second one.
select cron.unschedule('read-chat-channel') where exists (select 1 from cron.job where jobname = 'read-chat-channel');

select cron.schedule(
  'read-chat-channel',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://cnhzrjtgivwtgrzigkpz.supabase.co/functions/v1/read-channel',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_cAvWjxgUBXUG-4GsSTTEhg_lhht44A0"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);
