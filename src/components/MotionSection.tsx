import { useScrollReveal, AnimationPreset } from "@/hooks/useScrollReveal";
import { ReactNode } from "react";

interface Props {
  preset?: AnimationPreset;
  children: ReactNode;
  /** Used to stagger children in cinematic mode. Only matters when preset="cinematic". */
  index?: number;
  className?: string;
}

/**
 * Optional wrapper that adds scroll-triggered fade-up animation.
 * When preset is "none" (or undefined), renders children directly with zero overhead.
 */
export function MotionSection({ preset, children, index = 0, className = "" }: Props) {
  const { ref, className: revealClass } = useScrollReveal(preset ?? "none");

  // No preset → render children directly (zero DOM overhead, zero behavior change)
  if (!preset || preset === "none") return <>{children}</>;

  return (
    <div
      ref={ref}
      className={`${revealClass} ${className}`}
      style={preset === "cinematic" ? { animationDelay: `${index * 100}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Hero-specific parallax wrapper for cinematic mode.
 * Attaches a scroll listener that translates the hero image slower than scroll.
 */
export function HeroParallax({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <div className="hero-parallax-container overflow-hidden">
      <div className="hero-parallax-target">{children}</div>
    </div>
  );
}