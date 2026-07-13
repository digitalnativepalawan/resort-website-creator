import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, Lock, Plus, Trash2, Save, Download, Upload } from "lucide-react";
import { AgentConfig, AgentKnowledge, AGENT_SKILLS } from "@/hooks/useAgentConfig";
import { downloadAgentTemplate, downloadAgentData, parseAgentCsv } from "@/lib/agentCsv";
import type { ResortData, FaqItem } from "@/lib/resort-types";

interface Props {
  open: boolean;
  onClose: () => void;
  config: AgentConfig | null;
  onSave: (next: AgentConfig) => void;
  /** The live onboarding resort so its FAQs show as editable Q&A here. */
  resort: ResortData;
  /** Push edited FAQs back to the wizard/resort_settings. */
  onFaqChange: (faqs: FaqItem[]) => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Separate AGENT-ONLY admin. Gated by its own passkey (independent of the
 * site admin passkey). Lets the operator teach the agent knowledge (manually
 * or via a CSV template) and toggle its skills. The onboarding FAQs are shown
 * read-only as the auto-imported training source.
 */
export function AgentAdmin({ open, onClose, config, onSave, resort, onFaqChange }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState<AgentConfig | null>(config);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUnlocked(false);
      setCode("");
      setImportMsg(null);
      setDraft(config ? JSON.parse(JSON.stringify(config)) : null);
    }
  }, [open, config]);

  if (!config) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.trim() === (config.agent_passkey || "").trim()) {
      setUnlocked(true);
    } else {
      setCode("");
    }
  };

  const updateKnowledge = (next: AgentKnowledge[]) => setDraft((d) => (d ? { ...d, knowledge: next } : d));
  const toggleSkill = (id: string) =>
    setDraft((d) =>
      d ? { ...d, skills: d.skills.includes(id) ? d.skills.filter((s) => s !== id) : [...d.skills, id] } : d,
    );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { knowledge, skills, skillRows } = parseAgentCsv(text);
    setDraft((d) => {
      if (!d) return d;
      // CSV is authoritative for bulk: replace knowledge, and replace skills
      // only when the file actually contained skill rows.
      return {
        ...d,
        knowledge,
        skills: skillRows > 0 ? skills : d.skills,
      };
    });
    setImportMsg(
      `Imported ${knowledge.length} knowledge entr${knowledge.length === 1 ? "y" : "ies"} and ${skillRows} skill row${skillRows === 1 ? "" : "s"}. Review, then Save Agent.`,
    );
    e.target.value = "";
  };

  // Gate
  if (!unlocked) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="font-serif text-2xl text-center">Agent Admin</DialogTitle>
            <p className="text-center text-xs text-muted-foreground">This is the agent-only area — separate passkey from the site admin.</p>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="eyebrow">Agent Passkey</Label>
              <Input
                type="password"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                className="text-center tracking-[0.4em] text-lg"
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-[0.2em] text-xs py-5">
              Unlock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const k = draft?.knowledge ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <DialogTitle className="font-serif text-2xl">Agent Knowledge & Skills</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Bulk import / export — the easy path */}
          <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Bulk edit (spreadsheet)</div>
            <p className="text-xs text-muted-foreground">
              Download the template, fill it in Excel/Sheets, then upload. One file holds both knowledge and skills.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-none" onClick={downloadAgentTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" /> Template
              </Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => draft && downloadAgentData(draft)}>
                <Download className="h-3.5 w-3.5 mr-1" /> My data
              </Button>
              <label className="inline-flex cursor-pointer">
                <span className="inline-flex items-center gap-1 rounded-none border border-border bg-background px-3 py-2 text-sm hover:bg-primary/10">
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload CSV
                </span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
              </label>
            </div>
            {importMsg && <p className="text-xs text-primary">{importMsg}</p>}
          </div>

          {/* Auto-imported training source */}
          <div className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Auto-trained from onboarding:</span> the property's
            FAQs and details are fed to the agent automatically. Add extra knowledge below for anything not
            covered in the wizard.
          </div>

          {/* Onboarding FAQs — editable Q&A from the landing-page wizard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="eyebrow">Onboarding FAQs</Label>
              <span className="text-xs text-muted-foreground">from the setup wizard</span>
            </div>
            {(resort.faqs ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No FAQs yet — add them in the landing-page setup under the FAQ step.</p>
            )}
            {(resort.faqs ?? []).map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={f.question}
                    placeholder="Question (e.g. What time is check-in?)"
                    onChange={(e) => {
                      const next = resort.faqs.map((x, idx) => (idx === i ? { ...x, question: e.target.value } : x));
                      onFaqChange(next);
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onFaqChange(resort.faqs.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={f.answer}
                  placeholder="Answer…"
                  onChange={(e) => {
                    const next = resort.faqs.map((x, idx) => (idx === i ? { ...x, answer: e.target.value } : x));
                    onFaqChange(next);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Knowledge editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="eyebrow">Extra Knowledge</Label>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={() => updateKnowledge([...k, { id: uid(), question: "", answer: "", keywords: [] }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {k.length === 0 && (
              <p className="text-sm text-muted-foreground">No extra knowledge yet — the agent runs on onboarding FAQs and the uploaded CSV.</p>
            )}

            {k.map((item, i) => (
              <div key={item.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.question}
                    placeholder="Trigger / question (e.g. Do you allow pets?)"
                    onChange={(e) => {
                      const n = [...k];
                      n[i] = { ...n[i], question: e.target.value };
                      updateKnowledge(n);
                    }}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => updateKnowledge(k.filter((x) => x.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={item.answer}
                  placeholder="What the agent should say…"
                  onChange={(e) => {
                    const n = [...k];
                    n[i] = { ...n[i], answer: e.target.value };
                    updateKnowledge(n);
                  }}
                />
                <Input
                  value={(item.keywords || []).join(", ")}
                  placeholder="keywords (comma separated): pets, dog, cat"
                  onChange={(e) => {
                    const n = [...k];
                    n[i] = {
                      ...n[i],
                      keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    };
                    updateKnowledge(n);
                  }}
                  className="text-xs"
                />
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <Label className="eyebrow">Skills</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AGENT_SKILLS.map((s) => {
                const on = draft?.skills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={`flex items-start gap-2 rounded-lg border p-3 text-left transition ${
                      on ? "border-primary bg-primary/10" : "border-border bg-background/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                        on ? "bg-primary border-primary" : "border-border"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none"
            onClick={() => draft && onSave(draft)}
          >
            <Save className="h-4 w-4 mr-1" /> Save Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
