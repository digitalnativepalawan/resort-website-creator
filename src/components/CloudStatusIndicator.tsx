import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type CloudStatus = "idle" | "pending" | "saving" | "saved" | "error" | "blocked";

interface Props {
  status: CloudStatus;
  lastSavedAt: number | null;
}

function formatRelative(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleString();
}

const MAP: Record<CloudStatus, { label: string; icon: typeof Cloud; cls: string; desc: string }> = {
  idle:    { label: "Idle",     icon: Cloud,        cls: "bg-primary-foreground/10 text-primary-foreground/80",        desc: "Waiting for changes." },
  pending: { label: "Pending",  icon: Loader2,      cls: "bg-primary-foreground/15 text-primary-foreground",            desc: "Changes queued — saving shortly." },
  saving:  { label: "Saving…",  icon: Loader2,      cls: "bg-primary-foreground/20 text-primary-foreground",            desc: "Writing changes to the cloud." },
  saved:   { label: "Saved",    icon: CheckCircle2, cls: "bg-emerald-500/20 text-emerald-100",                          desc: "All changes are saved to the cloud." },
  error:   { label: "Error",    icon: AlertTriangle,cls: "bg-destructive text-destructive-foreground",                   desc: "Last save failed. Try Publish again." },
  blocked: { label: "Blocked",  icon: CloudOff,     cls: "bg-destructive text-destructive-foreground",                   desc: "Cloud writes are blocked by RLS policies." },
};

export function CloudStatusIndicator({ status, lastSavedAt }: Props) {
  // Tick every 15s so "Xm ago" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(i);
  }, []);

  const cfg = MAP[status];
  const Icon = cfg.icon;
  const spinning = status === "saving" || status === "pending";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-live="polite"
          aria-label={`Cloud status: ${cfg.label}`}
          className={`hidden sm:inline-flex items-center gap-1.5 px-2 h-6 rounded-none text-[10px] uppercase tracking-[0.2em] ${cfg.cls}`}
        >
          <Icon className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />
          <span>{cfg.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-xs">
          <div className="font-medium">Cloud: {cfg.label}</div>
          <div className="text-muted-foreground">{cfg.desc}</div>
          <div className="mt-1 text-muted-foreground">Last saved: {formatRelative(lastSavedAt)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
