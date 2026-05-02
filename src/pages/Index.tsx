import { useEffect, useState } from "react";
import { useResortStore, applyTheme } from "@/hooks/useResortStore";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { ResortSite } from "@/components/ResortSite";
import { TweaksPanel } from "@/components/TweaksPanel";
import { AdminGate } from "@/components/AdminGate";
import { AdminBar } from "@/components/AdminBar";
import { useToast } from "@/hooks/use-toast";
import { I18nContext, LangCode } from "@/lib/i18n";
import { ResortSEO } from "@/components/ResortSEO";

const LANG_KEY = "resort.lang.v1";
const AUTO_PUBLISH_KEY = "resort.autopublish.v1";

const Index = () => {
  const {
    resort, setResort, theme, setTheme, onboarded, setOnboarded,
    settingsLoaded, isAdmin, setIsAdmin, resetResort, clearResort, publishNow, cloudStatus, lastSavedAt,
    adminPasskey,
  } = useResortStore();
  const [wizardOpen, setWizardOpen] = useState(!onboarded);
  const [gateOpen, setGateOpen] = useState(false);
  const [lang, setLangState] = useState<LangCode>(() => {
    try { return (localStorage.getItem(LANG_KEY) as LangCode) || "EN"; } catch { return "EN"; }
  });
  const setLang = (l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  };
  const [autoPublish, setAutoPublishState] = useState<boolean>(() => {
    try { return localStorage.getItem(AUTO_PUBLISH_KEY) !== "0"; } catch { return true; }
  });
  const setAutoPublish = (v: boolean) => {
    setAutoPublishState(v);
    try { localStorage.setItem(AUTO_PUBLISH_KEY, v ? "1" : "0"); } catch {}
  };
  const { toast } = useToast();

  // Apply persisted theme on first paint
  useEffect(() => { applyTheme(theme); }, []); // eslint-disable-line

  useEffect(() => {
    if (settingsLoaded && onboarded) setWizardOpen(false);
  }, [settingsLoaded, onboarded]);

  const handleComplete = (data: typeof resort) => {
    // Update preview immediately so the user sees the change before the network call.
    setResort(data);
    setOnboarded(true);
    setWizardOpen(false);
    if (isAdmin) toast({ title: "Saved", description: "Site updated." });
    if (autoPublish) {
      void publishNow(data, theme);
    }
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      setWizardOpen(true);
    } else {
      setGateOpen(true);
    }
  };

  const tweaks = (
    <TweaksPanel
      theme={theme}
      setTheme={setTheme}
      currency={resort.currency}
      setCurrency={(c) => setResort({ ...resort, currency: c })}
      onRestart={() => setWizardOpen(true)}
      variant={isAdmin ? "inline" : "floating"}
    />
  );

  return (
    <I18nContext.Provider value={{ lang, setLang }}>
      <div className="min-h-screen">
        {isAdmin && (
          <AdminBar
            onEdit={() => setWizardOpen(true)}
            onPublish={() => { void publishNow(); }}
            onReset={() => { resetResort(); toast({ title: "Reset complete", description: "Default content restored." }); }}
            onClear={() => { clearResort(); toast({ title: "Cleared", description: "Site is now blank." }); setWizardOpen(true); }}
            onExit={() => { setIsAdmin(false); toast({ title: "Exited admin mode" }); }}
            cloudStatus={cloudStatus}
            lastSavedAt={lastSavedAt}
            tweaksSlot={tweaks}
          />
        )}

        <ResortSEO resort={resort} />

        <div className={isAdmin ? "pt-11" : ""}>
          <ResortSite resort={resort} onAdminClick={handleAdminClick} />
        </div>

        <OnboardingWizard
          open={settingsLoaded && wizardOpen}
          initial={resort}
          onComplete={handleComplete}
          onClose={onboarded || isAdmin ? () => setWizardOpen(false) : undefined}
          submitLabel={isAdmin ? "Save Changes" : undefined}
          autoPublish={autoPublish}
          onAutoPublishChange={setAutoPublish}
        />

        <AdminGate
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          onUnlock={() => { setIsAdmin(true); setGateOpen(false); }}
          passkey={adminPasskey}
        />
      </div>
    </I18nContext.Provider>
  );
};

export default Index;
