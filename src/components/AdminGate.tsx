import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  passkey: string;
}

export function AdminGate({ open, onClose, onUnlock, passkey }: Props) {
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.trim() === (passkey || "").trim()) {
      setCode("");
      onUnlock();
      toast({ title: "Admin mode", description: "You now have full edit access." });
    } else {
      toast({ title: "Incorrect passkey", description: "Try again.", variant: "destructive" });
      setCode("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCode(""); onClose(); } }}>
      <DialogContent className="max-w-sm bg-surface border-border">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <DialogTitle className="font-serif text-2xl text-center">Admin Access</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="eyebrow">Passkey</Label>
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
