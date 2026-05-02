-- Single-row settings table for the shared resort site
CREATE TABLE public.resort_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  resort jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resort_settings_singleton CHECK (id = 'singleton')
);

ALTER TABLE public.resort_settings ENABLE ROW LEVEL SECURITY;

-- Public single-shared-site model: anyone can read and write the one row.
CREATE POLICY "Public can read resort settings"
  ON public.resort_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can insert resort settings"
  ON public.resort_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (id = 'singleton');

CREATE POLICY "Public can update resort settings"
  ON public.resort_settings FOR UPDATE
  TO anon, authenticated
  USING (id = 'singleton')
  WITH CHECK (id = 'singleton');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_resort_settings_updated_at
BEFORE UPDATE ON public.resort_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the singleton row
INSERT INTO public.resort_settings (id, resort, theme)
VALUES ('singleton', '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Realtime so other devices see updates live
ALTER TABLE public.resort_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resort_settings;