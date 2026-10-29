-- Stage 8: moderator sign-in
-- Signed-in moderators (the "authenticated" role) can read every post and approve or reject it.
-- This is safe only because new sign-ups are turned off (Authentication -> Sign In / Providers).

create policy "Moderators can read every event"
  on public.events
  for select
  to authenticated
  using (true);

create policy "Moderators can review events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected'));

-- Read the whole table, but change only the review columns.
grant select on public.events to authenticated;
grant update (status, status_reason, reviewed_at, reviewed_by) on public.events to authenticated;
