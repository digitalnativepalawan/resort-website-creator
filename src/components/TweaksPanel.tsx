import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeTweaks, SERIF_OPTIONS, SANS_OPTIONS, DEFAULT_THEME, CURRENCIES, CURRENCY_LABELS, Currency } from "@/lib/resort-types";
import type { AnimationPreset } from "@/hooks/useScrollReveal";
import { Sliders, RotateCcw } from "lucide-react";

interface Props {
  theme: ThemeTweaks;
  setTheme: (t: ThemeTweaks) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onRestart: () => void;
  /** "floating" = standalone pill (default), "inline" = compact icon for admin bar */
  variant?: "floating" | "inline";
  animationPreset?: AnimationPreset;
  setAnimationPreset?: (v: AnimationPreset) => void;
  /** When true, the sheet opens automatically (used after first onboarding). */
  defaultOpen?: boolean;
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="eyebrow">{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer border border-border bg-transparent p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );
}

export function TweaksPanel({ theme, setTheme, currency, setCurrency, onRestart, variant = "floating", animationPreset, setAnimationPreset, defaultOpen }: Props) {
  const update = <K extends keyof ThemeTweaks>(k: K, v: ThemeTweaks[K]) => setTheme({ ...theme, [k]: v });

  const trigger = variant === "inline" ? (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Tweaks"
      className="h-8 w-8 sm:w-auto sm:px-3 rounded-none p-0 sm:gap-2 text-primary-foreground hover:bg-primary-foreground/10"
    >
      <Sliders className="h-3.5 w-3.5" />
      <span className="hidden sm:inline uppercase tracking-[0.2em] text-[10px]">Tweaks</span>
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2 border-border bg-surface shadow-card">
      <Sliders className="h-3.5 w-3.5" />
      <span className="uppercase tracking-[0.2em] text-[10px]">Tweaks</span>
    </Button>
  );

  const motionPresets: { value: AnimationPreset; label: string; desc: string }[] = [
    { value: "none", label: "None", desc: "No animation" },
    { value: "subtle", label: "Subtle", desc: "Sections fade in on scroll" },
    { value: "cinematic", label: "Cinematic", desc: "Staggered reveals + parallax hero" },
  ];

  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="bg-surface w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl">Tweak the Design</SheetTitle>
          <p className="text-sm text-muted-foreground">All changes persist across reloads.</p>
        </SheetHeader>

        <div className="py-6 space-y-5">
          {setAnimationPreset && (
            <div className="space-y-3 pb-5 border-b border-border">
              <Label className="eyebrow">Animation</Label>
              <div className="flex flex-col gap-2">
                {motionPresets.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-center gap-3 px-3 py-2.5 border cursor-pointer transition-colors ${
                      (animationPreset || "none") === p.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="animationPreset"
                      value={p.value}
                      checked={(animationPreset || "none") === p.value}
                      onChange={() => setAnimationPreset(p.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <ColorRow label="Primary Color" value={theme.primary} onChange={(v) => update("primary", v)} />
          <ColorRow label="Accent Color" value={theme.accent} onChange={(v) => update("accent", v)} />
          <ColorRow label="Text Color" value={theme.text} onChange={(v) => update("text", v)} />
          <ColorRow label="Background" value={theme.background} onChange={(v) => update("background", v)} />

          <div className="space-y-2">
            <Label className="eyebrow">Serif Font (Headings)</Label>
            <Select value={theme.serif} onValueChange={(v) => update("serif", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERIF_OPTIONS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="eyebrow">Sans Font (Body)</Label>
            <Select value={theme.sans} onValueChange={(v) => update("sans", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SANS_OPTIONS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="eyebrow">Currency (site-wide)</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{CURRENCY_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setTheme(DEFAULT_THEME)} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Default
            </Button>
            <Button variant="ghost" onClick={onRestart} className="text-muted-foreground">
              Edit resort content (re-run onboarding)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
