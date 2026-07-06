import { useEffect, useRef, useState } from "react";

export type AnimationPreset = "none" | "subtle" | "cinematic";

/**
 * Triggers a CSS animation class when an element scrolls into view.
 * Respects prefers-reduced-motion — disables all animation when set.
 * Disconnects after triggering (once-only, no memory leak).
 */
export function useScrollReveal(
  preset: AnimationPreset,
  options?: { threshold?: number },
) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (preset === "none" || reducedMotion || visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [preset, reducedMotion, visible, options?.threshold]);

  const className =
    preset !== "none" && !reducedMotion
      ? visible
        ? `animate-fade-up ${preset === "cinematic" ? "motion-cinematic" : ""}`
        : "opacity-0"
      : "";

  return { ref, visible, className, reducedMotion };
}
