import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, RotateCcw, Trash2, LogOut, Shield, UploadCloud, Bot } from "lucide-react";
import { CloudStatusIndicator, CloudStatus } from "@/components/CloudStatusIndicator";

interface Props {
  onEdit: () => void;
  onReset: () => void;
  onClear: () => void;
  onExit: () => void;
  onPublish: () => void;
  onAgent: () => void;
  cloudStatus: CloudStatus;
  lastSavedAt: number | null;
  /** Slot for the Tweaks trigger so everything sits in one uniform bar */
  tweaksSlot?: ReactNode;
}

export function AdminBar({ onEdit, onReset, onClear, onExit, onPublish, onAgent, cloudStatus, lastSavedAt, tweaksSlot }: Props) {
  const [confirm, setConfirm] = useState<null | "reset" | "clear">(null);

  const cfg = {
    reset: {
      title: "Reset to default content?",
      desc: "This restores the original demo resort. Your current edits will be lost.",
      action: () => { onReset(); setConfirm(null); },
    },
    clear: {
      title: "Clear all data?",
      desc: "This wipes the resort to a blank shell. You can re-fill it from scratch.",
      action: () => { onClear(); setConfirm(null); },
    },
  };

  const IconBtn = ({
    label, icon: Icon, onClick, danger,
  }: { label: string; icon: typeof Pencil; onClick: () => void; danger?: boolean }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          aria-label={label}
          className={`h-8 w-8 sm:w-auto sm:px-3 rounded-none p-0 sm:gap-2 text-primary-foreground hover:bg-primary-foreground/10 ${danger ? "hover:bg-destructive hover:text-destructive-foreground" : ""}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline uppercase tracking-[0.2em] text-[10px]">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="sm:hidden">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed top-0 inset-x-0 z-40 bg-primary text-primary-foreground border-b border-primary/40 shadow-card">
        <div className="container flex items-center justify-between gap-2 h-11">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] min-w-0">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline truncate">Admin</span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <CloudStatusIndicator status={cloudStatus} lastSavedAt={lastSavedAt} />
            <IconBtn label="Agent" icon={Bot} onClick={onAgent} />
            <IconBtn label="Edit" icon={Pencil} onClick={onEdit} />
            <IconBtn label="Publish" icon={UploadCloud} onClick={onPublish} />
            <IconBtn label="Reset" icon={RotateCcw} onClick={() => setConfirm("reset")} />
            <IconBtn label="Clear" icon={Trash2} onClick={() => setConfirm("clear")} danger />
            <span className="mx-1 h-5 w-px bg-primary-foreground/30" />
            {tweaksSlot}
            <IconBtn label="Exit" icon={LogOut} onClick={onExit} />
          </div>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">{confirm && cfg[confirm].title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm && cfg[confirm].desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && cfg[confirm].action()} className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
