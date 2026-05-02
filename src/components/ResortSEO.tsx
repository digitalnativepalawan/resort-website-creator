import { useEffect } from "react";
import type { ResortData } from "@/lib/resort-types";

function setMeta(attr: "name" | "property", key: string, value: string) {
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

interface Props {
  resort: ResortData;
}

export function ResortSEO({ resort }: Props) {
  useEffect(() => {
    const name = resort.name?.trim() || "Resort";
    const tagline = resort.tagline?.trim() || "";
    const title = truncate(tagline ? `${name} — ${tagline}` : name, 60);
    const description = truncate(resort.description || tagline || `Discover ${name}.`, 155);
    const image = resort.images?.[0] || "";
    const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    if (image) setMeta("property", "og:image", image);
    if (url) setMeta("property", "og:url", url);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (image) setMeta("name", "twitter:image", image);
    if (url) setLink("canonical", url);

    // JSON-LD LodgingBusiness
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name,
      description,
      ...(image ? { image: resort.images } : {}),
      ...(resort.location ? { address: { "@type": "PostalAddress", addressLocality: resort.location } } : {}),
      ...(resort.contact?.phone ? { telephone: resort.contact.phone } : {}),
      ...(resort.contact?.email ? { email: resort.contact.email } : {}),
      ...(url ? { url } : {}),
      ...(resort.pricePerNight
        ? { priceRange: `${resort.currency || ""} ${resort.pricePerNight}`.trim() }
        : {}),
    };

    let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-resort-seo]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-resort-seo", "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);
  }, [resort]);

  return null;
}
