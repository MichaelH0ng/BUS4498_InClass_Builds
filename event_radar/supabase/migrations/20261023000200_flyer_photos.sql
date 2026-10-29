-- Stage 7: photo uploads
-- Adds the flyer link to each post and a public storage bucket for the photos.

alter table public.events
  add column flyer_url text not null default '';

-- Visitors may read the flyer link, like the other card columns.
grant select (flyer_url) on public.events to anon, authenticated;

-- A public bucket: anyone with a photo's link can open it.
-- No storage policies are added, so the website can't upload or list files; only the agent uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
