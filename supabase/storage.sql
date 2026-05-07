insert into storage.buckets (id, name, public)
values
  ('media-assets', 'media-assets', false),
  ('media-thumbnails', 'media-thumbnails', false),
  ('campaign-exports', 'campaign-exports', false)
on conflict (id) do update
set
  name = excluded.name,
  public = false;

drop policy if exists "Authenticated users insert their own storage objects" on storage.objects;
create policy "Authenticated users insert their own storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('media-assets', 'media-thumbnails', 'campaign-exports')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users read their own storage objects" on storage.objects;
create policy "Authenticated users read their own storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('media-assets', 'media-thumbnails', 'campaign-exports')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users update their own storage objects" on storage.objects;
create policy "Authenticated users update their own storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('media-assets', 'media-thumbnails', 'campaign-exports')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('media-assets', 'media-thumbnails', 'campaign-exports')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users delete their own storage objects" on storage.objects;
create policy "Authenticated users delete their own storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('media-assets', 'media-thumbnails', 'campaign-exports')
  and (storage.foldername(name))[1] = auth.uid()::text
);

comment on table storage.objects is 'Private storage objects for Runners Circle Agent OS. Downloads should be issued through signed URLs only.';
