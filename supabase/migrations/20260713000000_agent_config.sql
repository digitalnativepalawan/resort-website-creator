-- Agent configuration: knowledge + skills for the Guest Concierge AI.
-- Separate from resort_settings so the agent has its own admin + passkey.
create table if not exists public.agent_config (
  id text primary key default 'singleton',
  knowledge jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  agent_passkey text not null default '4242',
  updated_at timestamptz default now()
);

alter table public.agent_config enable row level security;

-- Mirror the existing resort_settings access pattern (public read/write for the demo).
drop policy if exists "Public can read agent_config" on public.agent_config;
create policy "Public can read agent_config"
  on public.agent_config for select
  using (true);

drop policy if exists "Public can insert agent_config" on public.agent_config;
create policy "Public can insert agent_config"
  on public.agent_config for insert
  with check (true);

drop policy if exists "Public can update agent_config" on public.agent_config;
create policy "Public can update agent_config"
  on public.agent_config for update
  using (true);

insert into public.agent_config (id, knowledge, skills, agent_passkey)
values ('singleton', '[]'::jsonb, '["whatsapp_handoff","multilingual"]'::jsonb, '4242')
on conflict (id) do nothing;
