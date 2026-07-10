import { useEffect, useState } from "react";
import { useResortStore, applyTheme } from "@/hooks/useResortStore";
import type { AnimationPreset } from "@/hooks/useScrollReveal";
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
const ANIMATION_KEY = "resort.anim.v1";
const TWEAKS_SHOWN_KEY = "resort.tweaks.shown.v1";

const Index = () => {
  const {
    resort, setResort, theme, setTheme, onboarded, setOnboarded,
    settingsLoaded, isAdmin, setIsAdmin, resetResort, clearResort, publishNow, cloudStatus, lastSavedAt,
    adminPasskey, setAdminPasskey,
  } = useResortStore();
  const [wizardOpen, setWizardOpen] = useState(false);
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
  const [animPreset, setAnimPreset] = useState<AnimationPreset>(() => {
    try { return (localStorage.getItem(ANIMATION_KEY) as AnimationPreset) || "none"; } catch { return "none"; }
  });
  const setAnim = (v: AnimationPreset) => {
    setAnimPreset(v);
    try { localStorage.setItem(ANIMATION_KEY, v); } catch {}
  };
  const [tweaksShown, setTweaksShown] = useState<boolean>(() => {
    try { return localStorage.getItem(TWEAKS_SHOWN_KEY) === "1"; } catch { return false; }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { toast } = useToast();

  // Apply persisted theme on first paint
  useEffect(() => { applyTheme(theme); }, []); // eslint-disable-line

  useEffect(() => {
    if (settingsLoaded && onboarded) setWizardOpen(false);
  }, [settingsLoaded, onboarded]);

  const handleComplete = (data: typeof resort) => {
    setResort(data);
    setOnboarded(true);
    setWizardOpen(false);
    if (isAdmin) {
      toast({ title: "Saved", description: "Site updated." });
    } else if (!tweaksShown) {
      // First-time onboarding — open TweaksPanel so user discovers motion/style settings
      setTweaksOpen(true);
      setTweaksShown(true);
      try { localStorage.setItem(TWEAKS_SHOWN_KEY, "1"); } catch {}
    }
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

  const commonTweaksProps = {
    theme,
    setTheme,
    currency: resort.currency,
    setCurrency: (c: typeof resort.currency) => setResort({ ...resort, currency: c }),
    onRestart: () => setWizardOpen(true),
    animationPreset: animPreset,
    setAnimationPreset: setAnim,
  };

  const resortData = { ...resort, animationPreset: animPreset };

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
            tweaksSlot={<TweaksPanel {...commonTweaksProps} variant="inline" />}
          />
        )}

        {/* Floating TweaksPanel — visible to everyone except admin */}
        {!isAdmin && (
          <div className="fixed bottom-6 right-6 z-40">
            <TweaksPanel
              {...commonTweaksProps}
              variant="floating"
              open={tweaksOpen}
              onOpenChange={setTweaksOpen}
            />
          </div>
        )}

        <ResortSEO resort={resortData} />

        <div className={isAdmin ? "pt-11" : ""}>
          <ResortSite resort={resortData} onAdminClick={handleAdminClick} />
        </div>

        <OnboardingWizard
          open={settingsLoaded && wizardOpen}
          initial={resort}
          onComplete={handleComplete}
          onClose={onboarded || isAdmin ? () => setWizardOpen(false) : undefined}
          submitLabel={isAdmin ? "Save Changes" : undefined}
          autoPublish={autoPublish}
          onAutoPublishChange={setAutoPublish}
          isAdmin={isAdmin}
          adminPasskey={adminPasskey}
          onAdminPasskeyChange={setAdminPasskey}
        animationPreset={animPreset}
                  onAnimationPresetChange={setAnim}
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