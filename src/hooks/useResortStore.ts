import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RESORT, DEFAULT_THEME, DEFAULT_SECTION_ORDER, ResortData, ThemeTweaks } from "@/lib/resort-types";
import { hexToHsl } from "@/lib/color-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RESORT_KEY = "resort.data.v1";
const THEME_KEY = "resort.theme.v1";
const ONBOARDED_KEY = "resort.onboarded.v1";
const ADMIN_KEY = "resort.admin.v1";
const PASSKEY_KEY = "resort.passkey.v1";
const DEFAULT_PASSKEY = "5309";
const SETTINGS_ID = "singleton";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch { return fallback; }
}

export const EMPTY_RESORT: ResortData = {
  name: "",
  location: "",
  tagline: "",
  description: "",
  amenities: [],
  images: [],
  pricePerNight: 0,
  currency: "PHP",
  guests: 0,
  bedrooms: 0,
  bathrooms: 0,
  area: "",
  view: "",
  rooms: [],
  
  contact: { email: "", phone: "", whatsapp: "", address: "", website: "", socials: [] },
  videoTour: { enabled: false, youtubeUrl: "", title: "", subtitle: "" },
  faqs: [],
  sectionOrder: [...DEFAULT_SECTION_ORDER],
};

export function applyTheme(theme: ThemeTweaks) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHsl(theme.primary));
  root.style.setProperty("--ring", hexToHsl(theme.primary));
  root.style.setProperty("--accent", hexToHsl(theme.accent));
  root.style.setProperty("--foreground", hexToHsl(theme.text));
  root.style.setProperty("--card-foreground", hexToHsl(theme.text));
  root.style.setProperty("--background", hexToHsl(theme.background));
  root.style.setProperty("--font-serif", `'${theme.serif}', Georgia, serif`);
  root.style.setProperty("--font-sans", `'${theme.sans}', system-ui, sans-serif`);
}

function isNonEmpty(obj: unknown): boolean {
  return !!obj && typeof obj === "object" && Object.keys(obj as object).length > 0;
}

const ACTIVE_SECTION_IDS = new Set<string>(DEFAULT_SECTION_ORDER);

/** Strip obsolete fields and normalize sectionOrder so stale data can't re-enter the database. */
function sanitizeResort(input: ResortData): ResortData {
  const cloned: Record<string, unknown> = { ...(input as unknown as Record<string, unknown>) };
  // Remove deprecated fields entirely
  delete cloned.experiences;
  // Normalize sectionOrder to active sections only
  const order = Array.isArray(cloned.sectionOrder) ? (cloned.sectionOrder as unknown[]) : [];
  const filtered = order
    .filter((id): id is string => typeof id === "string" && ACTIVE_SECTION_IDS.has(id))
    .filter((id, i, arr) => arr.indexOf(id) === i);
  const normalized = filtered.length > 0
    ? [...filtered, ...DEFAULT_SECTION_ORDER.filter((id) => !filtered.includes(id))]
    : [...DEFAULT_SECTION_ORDER];
  cloned.sectionOrder = normalized;
  return cloned as unknown as ResortData;
}

function mergeResort(data: unknown): ResortData {
  return sanitizeResort({ ...DEFAULT_RESORT, ...(data as Partial<ResortData>) });
}

function mergeTheme(data: unknown): ThemeTweaks {
  return { ...DEFAULT_THEME, ...(data as Partial<ThemeTweaks>) };
}

function settingsSnapshot(resort: ResortData, theme: ThemeTweaks, passkey: string): string {
  return JSON.stringify({ resort: sanitizeResort(resort), theme, passkey });
}

async function saveSettings(resort: ResortData, theme: ThemeTweaks, passkey: string) {
  const cleanResort = sanitizeResort(resort);
  return supabase
    .from("resort_settings")
    .upsert(
      [{ id: SETTINGS_ID, resort: cleanResort as never, theme: theme as never, admin_passkey: passkey, updated_at: new Date().toISOString() }],
      { onConflict: "id" },
    );
}

export function useResortStore() {
  const [resort, setResort] = useState<ResortData>(() => load(RESORT_KEY, DEFAULT_RESORT));
  const [theme, setTheme] = useState<ThemeTweaks>(() => load(THEME_KEY, DEFAULT_THEME));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return localStorage.getItem(ONBOARDED_KEY) === "1"; } catch { return false; }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try { return localStorage.getItem(ADMIN_KEY) === "1"; } catch { return false; }
  });

  // Track whether we've finished the initial cloud load before we start writing back.
  const hydratedRef = useRef(false);
  const lastCloudSnapshotRef = useRef("");
  const resortRef = useRef(resort);
  const themeRef = useRef(theme);

  useEffect(() => { resortRef.current = resort; }, [resort]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // Initial load from cloud
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("resort_settings")
          .select("resort, theme")
          .eq("id", SETTINGS_ID)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("[resort] cloud load error", error);
        } else if (data) {
          const nextResort = isNonEmpty(data.resort) ? mergeResort(data.resort) : resortRef.current;
          const nextTheme = isNonEmpty(data.theme) ? mergeTheme(data.theme) : themeRef.current;
          lastCloudSnapshotRef.current = settingsSnapshot(nextResort, nextTheme);
          if (isNonEmpty(data.resort)) {
            setResort(nextResort);
            setOnboarded(true);
          }
          if (isNonEmpty(data.theme)) {
            setTheme(nextTheme);
          }
        }
      } catch (e) {
        console.error("[resort] cloud load failed", e);
      } finally {
        hydratedRef.current = true;
        if (!cancelled) setSettingsLoaded(true);
      }
    })();

    // Realtime: keep other devices in sync
    const channel = supabase
      .channel("resort_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resort_settings", filter: `id=eq.${SETTINGS_ID}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { resort?: unknown; theme?: unknown } | null;
          if (!row) return;
          const nextResort = isNonEmpty(row.resort) ? mergeResort(row.resort) : resortRef.current;
          const nextTheme = isNonEmpty(row.theme) ? mergeTheme(row.theme) : themeRef.current;
          lastCloudSnapshotRef.current = settingsSnapshot(nextResort, nextTheme);
          if (isNonEmpty(row.resort)) {
            setResort(nextResort);
            setOnboarded(true);
          }
          if (isNonEmpty(row.theme)) {
            setTheme(nextTheme);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist resort: localStorage cache + debounced cloud save
  useEffect(() => {
    localStorage.setItem(RESORT_KEY, JSON.stringify(resort));
  }, [resort]);

  // Persist theme: localStorage cache + apply
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    applyTheme(theme);
  }, [theme]);

  const [cloudStatus, setCloudStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error" | "blocked">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Persist the complete settings row so resort and theme never overwrite each other.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot = settingsSnapshot(resort, theme);
    if (snapshot === lastCloudSnapshotRef.current) return;
    setCloudStatus((s) => (s === "blocked" ? s : "pending"));
    const t = setTimeout(async () => {
      setCloudStatus((s) => (s === "blocked" ? s : "saving"));
      const { error } = await saveSettings(resort, theme);
      if (error) {
        console.error("[resort] cloud save error", error);
        setCloudStatus("error");
      } else {
        lastCloudSnapshotRef.current = snapshot;
        setCloudStatus("saved");
        setLastSavedAt(Date.now());
      }
    }, 400);
    return () => clearTimeout(t);
  }, [resort, theme]);

  useEffect(() => { localStorage.setItem(ONBOARDED_KEY, onboarded ? "1" : "0"); }, [onboarded]);
  useEffect(() => { localStorage.setItem(ADMIN_KEY, isAdmin ? "1" : "0"); }, [isAdmin]);

  const [cloudWriteBlocked] = useState(false);

  const publishNow = useCallback(async (nextResort = resortRef.current, nextTheme = themeRef.current) => {
    setCloudStatus("saving");
    const { error } = await saveSettings(nextResort, nextTheme);
    if (error) {
      console.error("[resort] publish failed", error);
      setCloudStatus("error");
      toast.error("Publish failed", { description: error.message });
      return false;
    }
    lastCloudSnapshotRef.current = settingsSnapshot(nextResort, nextTheme);
    setCloudStatus("saved");
    setLastSavedAt(Date.now());
    toast.success("Published", { description: "Your site is live with the latest changes." });
    return true;
  }, []);

  const resetResort = () => setResort(DEFAULT_RESORT);
  const clearResort = () => setResort(EMPTY_RESORT);

  return { resort, setResort, theme, setTheme, settingsLoaded, onboarded, setOnboarded, isAdmin, setIsAdmin, resetResort, clearResort, publishNow, cloudWriteBlocked, cloudStatus, lastSavedAt };
}
