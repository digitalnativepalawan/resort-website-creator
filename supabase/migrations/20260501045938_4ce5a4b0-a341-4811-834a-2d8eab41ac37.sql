create table if not exists public.resort_settings (
  id text primary key default 'singleton',
  resort jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.resort_settings enable row level security;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_resort_settings_updated_at on public.resort_settings;
create trigger update_resort_settings_updated_at
before update on public.resort_settings
for each row
execute function public.update_updated_at_column();

drop policy if exists "Public can read resort settings" on public.resort_settings;
drop policy if exists "Public can insert resort settings" on public.resort_settings;
drop policy if exists "Public can update resort settings" on public.resort_settings;

create policy "Public can read resort settings"
on public.resort_settings
for select
to anon, authenticated
using (true);

create policy "Public can insert resort settings"
on public.resort_settings
for insert
to anon, authenticated
with check (id = 'singleton');

create policy "Public can update resort settings"
on public.resort_settings
for update
to anon, authenticated
using (id = 'singleton')
with check (id = 'singleton');

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

drop policy if exists "Public can view resort images" on storage.objects;
drop policy if exists "Public can upload resort images" on storage.objects;
drop policy if exists "Public can replace resort images" on storage.objects;

create policy "Public can view resort images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'resort-images');

create policy "Public can upload resort images"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'resort-images');

create policy "Public can replace resort images"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'resort-images')
with check (bucket_id = 'resort-images');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resort_settings'
  ) then
    alter publication supabase_realtime add table public.resort_settings;
  end if;
end $$;