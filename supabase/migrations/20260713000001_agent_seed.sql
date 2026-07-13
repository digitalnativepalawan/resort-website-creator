-- ============================================================
-- Guest Concierge AI — one-click Supabase setup
-- Paste ALL of this into the Supabase SQL Editor and click Run.
-- Creates the agent table AND seeds a few starter Q&A.
-- (Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING.)
-- ============================================================

-- 1) Table: stores the agent's extra knowledge + skills, separate
--    from resort_settings so the agent has its own admin + passkey.
create table if not exists public.agent_config (
  id text primary key default 'singleton',
  knowledge jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  agent_passkey text not null default '4242',
  updated_at timestamptz default now()
);

-- 2) Access: mirror the existing resort_settings pattern (public read/write).
alter table public.agent_config enable row level security;

drop policy if exists "Public can read agent_config" on public.agent_config;
create policy "Public can read agent_config"
  on public.agent_config for select using (true);

drop policy if exists "Public can insert agent_config" on public.agent_config;
create policy "Public can insert agent_config"
  on public.agent_config for insert with check (true);

drop policy if exists "Public can update agent_config" on public.agent_config;
create policy "Public can update agent_config"
  on public.agent_config for update using (true);

-- 3) Seed: a singleton row with starter Q&A the operator fills in.
--    (Property-specific FAQs still live in the landing-page wizard.)
insert into public.agent_config (id, knowledge, skills, agent_passkey)
values (
  'singleton',
  '[
    {
      "question": "What time is check-in?",
      "answer": "Check-in is from 2:00 PM. Early check-in is subject to availability — just message us.",
      "keywords": ["check-in", "checkin", "arrival", "time"]
    },
    {
      "question": "What time is check-out?",
      "answer": "Check-out is until 12:00 PM (noon). Late check-out can be arranged at the front desk.",
      "keywords": ["check-out", "checkout", "departure", "time"]
    },
    {
      "question": "What is your cancellation policy?",
      "answer": "Free cancellation up to 48 hours before arrival. After that, the first night is charged.",
      "keywords": ["cancel", "cancellation", "refund", "policy"]
    },
    {
      "question": "Are pets allowed?",
      "answer": "Well-behaved pets are welcome. Please let us know in advance so we can prepare.",
      "keywords": ["pets", "pet", "dog", "cat"]
    },
    {
      "question": "Do you offer airport transfers?",
      "answer": "Yes — we can arrange airport pickup and drop-off. Message us on WhatsApp with your flight details.",
      "keywords": ["airport", "transfer", "pickup", "transport", "shuttle"]
    },
    {
      "question": "Is breakfast included?",
      "answer": "Breakfast is served 7:00–10:00 AM at the restaurant. Let us know about dietary needs anytime.",
      "keywords": ["breakfast", "meal", "food", "dining", "eat"]
    }
  ]'::jsonb,
  '["whatsapp_handoff", "multilingual"]'::jsonb,
  '4242'
)
on conflict (id) do nothing;
