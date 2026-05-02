-- Re-add storage SELECT policy for resort-images so listing/reading objects works consistently
drop policy if exists "Public can view resort images" on storage.objects;
create policy "Public can view resort images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'resort-images');

-- Allow deleting objects in resort-images so the editor can clean up replaced images
drop policy if exists "Public can delete resort images" on storage.objects;
create policy "Public can delete resort images"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'resort-images');

-- Ensure bucket settings (idempotent) — keep public, with size + mime limits
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resort-images',
  'resort-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Clean up the saved settings row: remove the leftover 'experiences' field
-- and normalize sectionOrder to only currently-rendered sections.
update public.resort_settings
set resort = (resort - 'experiences')
                || jsonb_build_object(
                  'sectionOrder',
                  '["overview","highlights","amenities","rooms","video","faq","map","contact"]'::jsonb
                )
where id = 'singleton';