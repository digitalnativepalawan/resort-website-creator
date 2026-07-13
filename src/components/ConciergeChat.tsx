import { useState, useMemo, useRef, useEffect } from "react";
import { ResortData, CURRENCY_SYMBOLS } from "@/lib/resort-types";
import type { AgentConfig } from "@/hooks/useAgentConfig";
import { MessageCircle, X, Sparkles } from "lucide-react";

interface Props {
  resort: ResortData;
  agentConfig?: AgentConfig | null;
  /** Optional real agent backend. When set, answers come from your LLM. */
  agentEndpoint?: string;
}

interface KBItem {
  q: string;
  a: string;
  k: string[];
}

/**
 * Guest Concierge AI — a working chat widget that learns from the
 * onboarding data (FAQs + rooms + amenities + WhatsApp) and any extra
 * knowledge the operator adds in the Agent Admin.
 *
 * Offline mode: keyword-matched against the knowledge base.
 * Live mode: set VITE_AGENT_API and answers come from your backend.
 */
export function ConciergeChat({ resort, agentConfig, agentEndpoint }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ who: "me" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sym = CURRENCY_SYMBOLS[resort.currency] ?? resort.currency + " ";

  // Build the knowledge base from onboarding data + agent admin knowledge.
  const kb = useMemo<KBItem[]>(() => {
    const items: KBItem[] = [];

    // 1) Onboarding FAQs
    (resort.faqs ?? []).forEach((f) => {
      if (!f.question.trim() && !f.answer.trim()) return;
      items.push({
        q: f.question,
        a: f.answer,
        k: f.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
      });
    });

    // 2) Operator-taught knowledge (Agent Admin)
    (agentConfig?.knowledge ?? []).forEach((k) => {
      items.push({ q: k.question, a: k.answer, k: (k.keywords ?? []).map((s) => s.toLowerCase()) });
    });

    // 3) Derived facts from the other onboarding fields (free training!)
    const r = resort;
    if (r.name)
      items.push({
        q: `about ${r.name}`,
        a: `${r.name}${r.tagline ? " — " + r.tagline : ""}. ${r.description || ""}`.trim(),
        k: [r.name.toLowerCase(), "about", "property", "tell"],
      });
    if (r.location)
      items.push({
        q: "where are you located",
        a: `We're located in ${r.location}.`,
        k: ["location", "where", "address", "directions", "find"],
      });
    if (r.rooms?.length)
      items.push({
        q: "rooms and rates",
        a: r.rooms
          .map((rm) => `${rm.name}: ${sym}${rm.pricePerNight.toLocaleString()} per night`)
          .join(". "),
        k: ["room", "rooms", "rate", "price", "cost", "suite", "stay"],
      });
    if (r.amenities?.length)
      items.push({
        q: "amenities",
        a: "Our amenities include: " + r.amenities.join(", ") + ".",
        k: ["amenit", "facilit", "feature", "service"],
      });
    if (r.contact?.whatsapp)
      items.push({
        q: "whatsapp",
        a: `You can reach our team on WhatsApp at ${r.contact.whatsapp}.`,
        k: ["whatsapp", "contact", "reach", "call", "message", "talk"],
      });
    if (r.contact?.email)
      items.push({
        q: "email",
        a: `Email us at ${r.contact.email}.`,
        k: ["email", "write"],
      });
    return items;
  }, [resort, agentConfig, sym]);

  const quick = useMemo(
    () => (resort.faqs ?? []).filter((f) => f.question.trim()).slice(0, 4).map((f) => f.question),
    [resort.faqs],
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  async function answer(msg: string): Promise<string> {
    // Live mode: delegate to the real agent backend.
    if (agentEndpoint) {
      try {
        const res = await fetch(agentEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            tenant: resort.canonicalUrl || resort.name,
            skills: agentConfig?.skills ?? [],
            // Send the FULL agent knowledge (onboarding FAQs + derived facts + extra)
            // so the real backend can answer from the same data the offline mode uses.
            knowledge: kb.map((it) => ({ question: it.q, answer: it.a, keywords: it.k })),
          }),
        });
        if (res.ok) {
          const d = await res.json();
          if (d?.reply) return d.reply;
        }
      } catch (e) {
        /* fall through to offline */
      }
    }

    // Offline mode: keyword match over the knowledge base.
    const m = msg.toLowerCase();
    let best: KBItem | null = null;
    let score = 0;
    for (const it of kb) {
      let s = 0;
      for (const kw of it.k) if (m.includes(kw)) s += 2;
      for (const w of m.split(/\W+/).filter((w) => w.length > 3)) if (it.q.toLowerCase().includes(w)) s += 1;
      if (s > score) {
        score = s;
        best = it;
      }
    }
    if (best && score > 0) return best.a;

    // Graceful handoff to a human.
    if (resort.contact?.whatsapp) {
      const wa = resort.contact.whatsapp.replace(/[^0-9]/g, "");
      return `I'm not certain about that one yet — let me connect you with the team on WhatsApp and a human will follow up. 👉 https://wa.me/${wa}`;
    }
    return "I'm not certain about that yet — please ask our team directly and we'll help you.";
  }

  function add(who: "me" | "bot", text: string) {
    setMessages((prev) => [...prev, { who, text }]);
  }

  async function send(text?: string) {
    const v = (text ?? input).trim();
    if (!v) return;
    if (!text) setInput("");
    add("me", v);
    setTyping(true);
    const reply = await answer(v);
    setTyping(false);
    add("bot", reply);
  }

  // Welcome message once opened.
  useEffect(() => {
    if (open && messages.length === 0) {
      const name = resort.name || "your stay";
      add(
        "bot",
        `Hi! I'm the ${name} Guest Concierge 🔔 Ask me about check-in, rooms, amenities, or anything about your stay.`,
      );
    }
    // eslint-disable-next-line
  }, [open]);

  const skillCount = agentConfig?.skills?.length ?? 0;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-card hover:bg-primary/90"
          aria-label="Open concierge"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em]">Concierge</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 left-6 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <div className="font-serif text-sm leading-tight">{resort.name || "Guest Concierge"}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">
                  AI · {kb.length} facts{skillCount > 0 ? ` · ${skillCount} skills` : ""}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/40 p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.who === "me"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                    : "mr-auto border border-border bg-card rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Concierge is typing…
              </div>
            )}
          </div>

          {/* Quick chips */}
          {quick.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {quick.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-primary/10"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the concierge…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
