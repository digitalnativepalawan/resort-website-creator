import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentKnowledge {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface AgentConfig {
  id: string;
  /** Extra knowledge the operator teaches the agent, beyond the onboarding FAQs. */
  knowledge: AgentKnowledge[];
  /** Enabled skill ids (see SKILLS in AgentAdmin). */
  skills: string[];
  /** Separate passkey for the agent-only admin. */
  agent_passkey: string;
  updated_at?: string;
}

/** The fixed set of agent skills an operator can toggle on/off. */
export const AGENT_SKILLS = [
  { id: "whatsapp_handoff", label: "WhatsApp handoff", desc: "Escalate anything it's unsure about to your team on WhatsApp." },
  { id: "multilingual", label: "Reply in guest's language", desc: "Answers in English, Tagalog, or the guest's language." },
  { id: "bookings", label: "Booking & availability", desc: "Shares room types, rates, and availability." },
  { id: "tours", label: "Tours & experiences", desc: "Recommends activities and how to book." },
  { id: "dining", label: "Dining & menu", desc: "Restaurant hours, menu highlights, reservations, dietary." },
  { id: "requests", label: "In-stay requests", desc: "Towels, cleaning, late checkout, assistance." },
] as const;

export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  AGENT_SKILLS.map((s) => [s.id, s.label]),
);

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  id: "singleton",
  knowledge: [],
  skills: ["whatsapp_handoff", "multilingual"],
  agent_passkey: "4242",
};

const ID = "singleton";

/**
 * Loads/saves the agent's knowledge + skills from Supabase.
 * Mirrors the resort_settings singleton pattern used by useResortStore.
 */
export function useAgentConfig() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("agent_config")
          .select("*")
          .eq("id", ID)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setConfig({ ...DEFAULT_AGENT_CONFIG, ...data });
        } else {
          setConfig(DEFAULT_AGENT_CONFIG);
          await (supabase as any).from("agent_config").upsert([DEFAULT_AGENT_CONFIG]);
        }
      } catch (e) {
        console.error("[agent] load failed", e);
        setConfig(DEFAULT_AGENT_CONFIG);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: AgentConfig) => {
    setConfig(next);
    const { error } = await (supabase as any)
      .from("agent_config")
      .upsert([{ ...next, updated_at: new Date().toISOString() }]);
    if (error) console.error("[agent] save failed", error);
  }, []);

  return { config, setConfig, save, loaded };
}
