import { ResortData, Room, CURRENCY_SYMBOLS, Currency, SocialLink, DEFAULT_SECTION_ORDER, SectionId, Restaurant, ExperienceGroup } from "@/lib/resort-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  MapPin, Users, BedDouble, Bath, Maximize, Eye, ChevronRight, Mail, Phone, MessageCircle, Globe,
  Instagram, Facebook, Youtube, Linkedin, Music2, Send, MessageSquare, Camera, Link as LinkIcon,
  Menu, ChevronDown, X, ChevronUp, PlayCircle, HelpCircle, Utensils, Compass, Clock, ExternalLink,
} from "lucide-react";
import { useState, ImgHTMLAttributes } from "react";
import { useI18n, LANGUAGES, LangCode } from "@/lib/i18n";
import { MotionSection } from "@/components/MotionSection";

// Image with automatic placeholder fallback when src fails to load.
function ImageWithFallback({ src, alt, fallbackLabel, className, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { fallbackLabel?: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground text-[10px] sm:text-xs uppercase tracking-[0.2em] ${className ?? ""}`}>
        {fallbackLabel ?? "Image unavailable"}
      </div>
    );
  }
  return <img src={src as string} alt={alt} className={className} onError={() => setErrored(true)} {...rest} />;
}

// Extract a YouTube video ID from a variety of URL formats.
function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // raw 11-char ID
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch { /* noop */ }
  return null;
}

// Extract a Google Maps embed URL. Accepts:
//  - a raw embed src (https://www.google.com/maps/embed?...)
//  - a full <iframe ... src="..."> snippet pasted from "Embed a map"
//  - a regular maps share link (https://www.google.com/maps/place/.../@lat,lng,...) which we wrap.
function getMapEmbedSrc(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  // <iframe ... src="..."> snippet
  const iframeMatch = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  const candidate = iframeMatch ? iframeMatch[1] : raw;
  try {
    const u = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
    if (!/(^|\.)google\.[a-z.]+$/i.test(u.hostname)) return null;
    // Already an embed URL
    if (u.pathname.startsWith("/maps/embed")) return u.toString();
    // Regular maps link — wrap as a basic embed via the place query.
    if (u.pathname.startsWith("/maps")) {
      const q = u.searchParams.get("q") || u.pathname.split("/place/")[1]?.split("/")[0] || "";
      const coords = candidate.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coords) {
        return `https://www.google.com/maps?q=${coords[1]},${coords[2]}&output=embed`;
      }
      if (q) return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(q))}&output=embed`;
    }
  } catch { /* noop */ }
  return null;
}

const currencySymbol = (c: string) => CURRENCY_SYMBOLS[c as Currency] ?? c + " ";
/** Replace any currency symbol in a stored string with the active one, so admin currency switches reflect everywhere. */
const normalizeCurrency = (text: string, c: string) => {
  if (!text) return text;
  const sym = currencySymbol(c);
  return text.replace(/[€$₱]/g, sym);
};

// ----- Social platform → icon map -----
function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const map: Record<string, JSX.Element> = {
    Instagram: <Instagram className={className} />,
    Facebook: <Facebook className={className} />,
    YouTube: <Youtube className={className} />,
    LinkedIn: <Linkedin className={className} />,
    TikTok: <Music2 className={className} />,
    Pinterest: <Camera className={className} />,
    WhatsApp: <MessageCircle className={className} />,
    Telegram: <Send className={className} />,
    Threads: <MessageSquare className={className} />,
    Snapchat: <Camera className={className} />,
    X: <span className={`${className} font-serif font-semibold leading-none`} aria-hidden>𝕏</span>,
    Other: <LinkIcon className={className} />,
  };
  return map[platform] ?? <LinkIcon className={className} />;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function NewsletterForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (email) { setDone(true); setEmail(""); setTimeout(() => setDone(false), 3000); } }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        className="flex-1 min-w-0 h-10 px-3 bg-background border border-border text-sm focus:outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="h-10 px-4 bg-accent text-accent-foreground text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
      >
        {t("subscribe")}
      </button>
      {done && <p className="text-xs text-accent sm:basis-full">{t("subscribed")}</p>}
    </form>
  );
}

export function ResortSite({ resort, onAdminClick }: { resort: ResortData; onAdminClick?: () => void }) {
  const { lang, setLang, t } = useI18n();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ----- Compute section visibility & order -----
  const videoTour = resort.videoTour;
  const youtubeId = videoTour?.enabled ? getYoutubeId(videoTour.youtubeUrl) : null;
  const faqs = (resort.faqs ?? []).filter((f) => f.question.trim() || f.answer.trim());
  const mapEmbed = resort.mapEmbed;
  const mapSrc = mapEmbed?.enabled ? getMapEmbedSrc(mapEmbed.embedUrl) : null;
  const restaurant = resort.restaurant;
  const restaurantVisible = !!(restaurant?.enabled && (restaurant.name || restaurant.heroImage || restaurant.description || (restaurant.menu?.length ?? 0) > 0));
  const experienceGroups: ExperienceGroup[] = (resort.experienceCategories ?? []).filter(
    (g) => g && g.name && (g.items?.length ?? 0) > 0,
  );
  const experiencesVisible = experienceGroups.length > 0;

  const SECTION_LABELS: Record<SectionId, string> = {
    overview: t("overview"),
    highlights: t("highlights"),
    amenities: t("amenities"),
    rooms: t("rooms"),
    restaurant: restaurant?.name?.trim() || t("restaurant"),
    experiences: t("experiences"),
    video: t("video"),
    faq: t("faq"),
    map: t("map"),
    contact: t("contact"),
  };


  const SECTION_VISIBLE: Record<SectionId, boolean> = {
    overview: true,
    highlights: resort.images.slice(1, 4).length > 0,
    amenities: resort.amenities.length > 0,
    rooms: resort.rooms.length > 0,
    restaurant: restaurantVisible,
    experiences: experiencesVisible,
    video: !!youtubeId,
    faq: faqs.length > 0,
    map: !!mapSrc,
    contact: false,
  };

  const orderRaw = (resort.sectionOrder && resort.sectionOrder.length > 0)
    ? resort.sectionOrder
    : DEFAULT_SECTION_ORDER;
  // Dedupe + only keep known ids
  const dedupedSaved: SectionId[] = [];
  const _seen = new Set<SectionId>();
  for (const id of orderRaw) {
    if (DEFAULT_SECTION_ORDER.includes(id as SectionId) && !_seen.has(id as SectionId)) {
      _seen.add(id as SectionId);
      dedupedSaved.push(id as SectionId);
    }
  }
  // Insert any missing sections at their DEFAULT position (preserves intent like "Contact stays last").
  const order: SectionId[] = [...dedupedSaved];
  for (const id of DEFAULT_SECTION_ORDER) {
    if (order.includes(id)) continue;
    const defaultIdx = DEFAULT_SECTION_ORDER.indexOf(id);
    let insertAt = order.length;
    for (let i = defaultIdx - 1; i >= 0; i--) {
      const prev = DEFAULT_SECTION_ORDER[i];
      const pos = order.indexOf(prev);
      if (pos !== -1) { insertAt = pos + 1; break; }
    }
    order.splice(insertAt, 0, id);
  }

  const SECTIONS = order
    .filter((id) => SECTION_VISIBLE[id])
    .map((id) => ({ id, label: SECTION_LABELS[id] }));

  const hero = resort.images[0];
  const gallery = resort.images.slice(1, 4);
  const stats = [
    { label: t("guests"), value: resort.guests, icon: Users },
    { label: t("bedrooms"), value: resort.bedrooms, icon: BedDouble },
    { label: t("bathrooms"), value: resort.bathrooms, icon: Bath },
    { label: t("area"), value: resort.area, icon: Maximize },
    { label: t("view"), value: resort.view, icon: Eye },
  ];

  const socials = resort.contact.socials ?? [];


  return (
    <div className="bg-background text-foreground">
      {/* NAV */}
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex items-center justify-between py-4 sm:py-5">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex items-center gap-2 uppercase tracking-[0.3em] text-[10px] sm:text-xs hover:text-accent transition-colors">
                <Menu className="h-4 w-4" /> <span className="hidden xs:inline">{t("menu")}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-surface w-72 sm:w-96">
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl tracking-[0.2em]">{resort.name || "Menu"}</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 space-y-1">
                {SECTIONS.map((s) => (
                  <div key={s.id} className="border-b border-border">
                    <button
                      onClick={() => { setMenuOpen(false); setTimeout(() => scrollToId(s.id), 50); }}
                      className="w-full text-left py-3 px-2 font-serif text-xl hover:text-accent transition-colors"
                    >
                      {s.label}
                    </button>
                  </div>
                ))}
              </nav>
              {socials.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="eyebrow mb-3">{t("follow")}</div>
                  <div className="flex flex-wrap gap-3">
                    {socials.map((s) => (
                      <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                         className="inline-flex h-10 w-10 items-center justify-center border border-border hover:border-accent hover:text-accent transition-colors">
                        <SocialIcon platform={s.platform} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <div className="font-serif text-xl sm:text-2xl tracking-[0.2em]">{resort.name?.split(" ")[0]?.toUpperCase() || "RESORT"}</div>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden lg:flex items-center gap-5 mr-2">
              {restaurantVisible && (
                <button
                  type="button"
                  onClick={() => scrollToId("restaurant")}
                  className="inline-flex items-center gap-1.5 uppercase tracking-[0.25em] text-[10px] hover:text-accent transition-colors"
                >
                  <Utensils className="h-3 w-3" /> {SECTION_LABELS.restaurant}
                </button>
              )}
              {experiencesVisible && (
                <button
                  type="button"
                  onClick={() => scrollToId("experiences")}
                  className="inline-flex items-center gap-1.5 uppercase tracking-[0.25em] text-[10px] hover:text-accent transition-colors"
                >
                  <Compass className="h-3 w-3" /> {t("experiences")}
                </button>
              )}
            </nav>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 uppercase tracking-[0.2em] text-[10px] hover:text-accent transition-colors">
                  {lang} <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface min-w-[10rem]">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLang(l.code as LangCode)} className="uppercase tracking-[0.2em] text-xs">
                    <span className="font-semibold mr-2">{l.code}</span>
                    <span className="text-muted-foreground normal-case tracking-normal">{l.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={() => scrollToId("contact")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-[0.2em] text-[10px] px-3 sm:px-5"
            >
              {t("enquire")}
            </Button>
          </div>
        </div>
      </header>

      {/* DYNAMIC SECTIONS — order controlled by resort.sectionOrder */}
      {(() => {
        const renderers: Record<SectionId, () => JSX.Element | null> = {
          overview: () => (
            <div key="overview">
              {/* HERO */}
              <section id="overview" className="relative">
                {hero && (
                  <div className="relative h-[55vh] sm:h-[70vh] lg:h-[80vh] w-full overflow-hidden">
                    <img src={hero} alt={resort.name} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-transparent to-foreground/50" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-10 lg:p-12">
                      <div className="container">
                        <div className="eyebrow text-background/80 mb-3">{t("overview")}</div>
                        <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl text-background leading-[1.05]">{resort.name}</h1>
                        <div className="mt-4 flex items-center gap-2 text-background/90">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="uppercase tracking-[0.2em] text-[10px] sm:text-xs">{resort.location}</span>
                        </div>
                        <button
                          onClick={() => setGalleryOpen(true)}
                          className="mt-5 sm:mt-6 inline-flex items-center gap-2 text-background/90 text-[10px] sm:text-xs uppercase tracking-[0.25em] border-b border-background/40 pb-1 hover:border-accent hover:text-accent transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" /> {t("viewImages")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              {/* TAGLINE */}
              <section className="container py-12 sm:py-20 lg:py-24 max-w-3xl text-center">
                <div className="hairline mx-auto mb-6" />
                <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl leading-tight">{resort.tagline}</h2>
                <p className="mt-6 sm:mt-8 text-sm sm:text-base lg:text-lg leading-relaxed text-muted-foreground whitespace-pre-line">{resort.description}</p>
              </section>
              {/* STATS */}
              <section className="container pb-12 sm:pb-20 lg:pb-24 max-w-3xl">
                <div className="border-y border-border">
                  {stats.map((s, i) => (
                    <div key={s.label} className={`flex items-center justify-between gap-4 py-4 sm:py-5 ${i > 0 ? "border-t border-border" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <s.icon className="h-4 w-4 text-accent shrink-0" />
                        <span className="eyebrow truncate">{s.label}</span>
                      </div>
                      <span className="font-serif text-base sm:text-lg lg:text-xl text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ),
          highlights: () => {
            const customHighlights = (resort.highlights ?? []).filter((h) => h.image || h.title || h.caption);
            const items = customHighlights.length > 0
              ? customHighlights.slice(0, 3).map((h) => ({
                  image: h.image || gallery[0] || resort.images[0] || "",
                  title: h.title,
                  caption: h.caption,
                }))
              : gallery.map((src, i) => ({
                  image: src,
                  title: ["Private dock", "Cliffside living", "Multiple pools"][i] ?? `Highlight ${i + 1}`,
                  caption: ["Step from water to villa", "Astonishing views", "Layered infinity pools"][i] ?? "",
                }));
            if (items.length === 0 || items.every((it) => !it.image)) return null;
            return (
              <section key="highlights" id="highlights" className="container py-12 sm:py-20 lg:py-24 max-w-6xl">
                <div className="text-center mb-8 sm:mb-12 lg:mb-14">
                  <div className="eyebrow mb-3">{t("highlights")}</div>
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("experienceUnforgettable")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {items.map((it, i) => (
                    <button key={i} onClick={() => setGalleryOpen(true)} className="group text-left">
                      <div className="aspect-[4/5] overflow-hidden bg-muted">
                        {it.image && <img src={it.image} alt={it.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                      </div>
                      <div className="mt-4 text-center">
                        <div className="font-serif text-lg sm:text-xl">{it.title}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-[0.2em]">{it.caption}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          },
          amenities: () => resort.amenities.length === 0 ? null : (
            <section key="amenities" id="amenities" className="bg-surface-2/40 py-12 sm:py-20 lg:py-24 border-y border-border">
              <div className="container max-w-4xl">
                <div className="text-center mb-8 sm:mb-10">
                  <div className="hairline mx-auto mb-4" />
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("signatureAmenities")}</h3>
                  <p className="mt-3 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em]">{t("craftedDiscerning")}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-border border border-border auto-rows-fr">
                  {resort.amenities.map((a) => (
                    <div key={a} className="bg-background p-4 sm:p-5 text-center flex items-center justify-center min-h-[72px] sm:min-h-[88px]">
                      <div className="font-serif text-sm sm:text-base lg:text-lg break-words leading-tight">{a}</div>
                    </div>
                  ))}
                  {Array.from({ length: (4 - (resort.amenities.length % 4)) % 4 }).map((_, i) => (
                    <div key={`fill-lg-${i}`} className="bg-background hidden md:block min-h-[88px]" aria-hidden />
                  ))}
                  {Array.from({ length: (3 - (resort.amenities.length % 3)) % 3 }).map((_, i) => (
                    <div key={`fill-md-${i}`} className="bg-background hidden sm:max-md:block min-h-[88px]" aria-hidden />
                  ))}
                </div>
              </div>
            </section>
          ),
          rooms: () => resort.rooms.length === 0 ? null : (
            <section key="rooms" id="rooms" className="container py-12 sm:py-20 lg:py-24 max-w-6xl">
              <div className="text-center mb-8 sm:mb-12 lg:mb-14">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3">{t("accommodations")}</div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("roomsAndSuites")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr [&>*]:h-full justify-items-stretch">
                {resort.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="group text-left bg-card border border-border hover:border-accent transition-colors shadow-card overflow-hidden flex flex-col h-full w-full"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {room.images[0] ? (
                        <img src={room.images[0]} alt={room.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px] sm:text-xs uppercase tracking-[0.2em]">{t("noImage")}</div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <div className="font-serif text-lg sm:text-xl">{room.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em]">{room.size} · {room.bedSize} · {t("upTo")} {room.maxAdults + room.maxChildren}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{room.shortDescription}</p>
                      <div className="flex items-end justify-between gap-3 pt-3 border-t border-border mt-2">
                        <div>
                          <div className="eyebrow">{t("from")}</div>
                          <div className="font-serif text-xl sm:text-2xl text-primary">{currencySymbol(resort.currency)}{room.pricePerNight.toLocaleString()}</div>
                        </div>
                        <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent inline-flex items-center gap-1 shrink-0">{t("details")} <ChevronRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ),
          restaurant: () => !restaurantVisible || !restaurant ? null : (
            <section key="restaurant" id="restaurant" className="bg-surface-2/40 py-12 sm:py-20 lg:py-24 border-y border-border">
              <div className="container max-w-6xl">
                <div className="text-center mb-8 sm:mb-12">
                  <div className="hairline mx-auto mb-4" />
                  <div className="eyebrow mb-3 inline-flex items-center gap-2 justify-center">
                    <Utensils className="h-3 w-3" /> {t("restaurantEyebrow")}
                  </div>
                  {restaurant.name && <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{restaurant.name}</h3>}
                  {restaurant.tagline && <p className="mt-3 text-sm sm:text-base text-muted-foreground italic">{restaurant.tagline}</p>}
                </div>

                {(restaurant.heroImage || restaurant.description) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 items-center">
                    {restaurant.heroImage && (
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <ImageWithFallback src={restaurant.heroImage} alt={restaurant.name || "Restaurant"} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-5">
                      {restaurant.description && (
                        <p className="text-sm sm:text-base leading-relaxed text-muted-foreground whitespace-pre-line">{restaurant.description}</p>
                      )}
                      {(restaurant.cuisine || restaurant.hours || restaurant.dressCode || restaurant.reservation) && (
                        <div className="border-y border-border">
                          {[
                            { label: t("cuisine"), value: restaurant.cuisine },
                            { label: t("hours"), value: restaurant.hours },
                            { label: t("dressCode"), value: restaurant.dressCode },
                            { label: t("reservations"), value: restaurant.reservation },
                          ].filter((r) => r.value).map((row, i) => (
                            <div key={row.label} className={`flex items-start justify-between gap-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                              <span className="eyebrow shrink-0">{row.label}</span>
                              <span className="text-sm text-right">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        onClick={() => scrollToId("contact")}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-[0.25em] text-[10px] px-5"
                        size="sm"
                      >
                        {t("reserve")}
                      </Button>
                    </div>
                  </div>
                )}

                {restaurant.menu && restaurant.menu.length > 0 && (
                  <div className="mt-12 sm:mt-16">
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="eyebrow">{t("menuHighlights")}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {restaurant.menu.map((dish) => (
                        <div key={dish.id} className="bg-card border border-border shadow-card overflow-hidden flex flex-col">
                          {dish.image && (
                            <div className="aspect-[4/3] bg-muted overflow-hidden">
                              <ImageWithFallback src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="p-4 flex flex-col gap-2 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="font-serif text-base sm:text-lg">{dish.name}</div>
                              {dish.price && <div className="font-serif text-base sm:text-lg text-primary whitespace-nowrap">{normalizeCurrency(dish.price, resort.currency)}</div>}
                            </div>
                            {dish.description && <p className="text-xs sm:text-sm text-muted-foreground">{dish.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {restaurant.gallery && restaurant.gallery.length > 0 && (
                  <div className="mt-12 sm:mt-16">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                      {restaurant.gallery.map((src, i) => (
                        <div key={i} className="aspect-square overflow-hidden bg-muted">
                          <ImageWithFallback src={src} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ),
          experiences: () => !experiencesVisible ? null : (
            <section key="experiences" id="experiences" className="container py-12 sm:py-20 lg:py-24 max-w-6xl">
              <div className="text-center mb-8 sm:mb-12">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3 inline-flex items-center gap-2 justify-center">
                  <Compass className="h-3 w-3" /> {t("experiencesEyebrow")}
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("experiences")}</h3>
              </div>
              <div className="space-y-12 sm:space-y-16">
                {experienceGroups.map((group) => (
                  <div key={group.id} className="space-y-5 sm:space-y-6">
                    <div className="flex items-baseline justify-between border-b border-border pb-2">
                      <h4 className="font-serif text-xl sm:text-2xl">{group.name}</h4>
                      <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? t("offering") : t("offerings")}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
                      {group.items.map((it) => (
                        <div key={it.id} className="bg-card border border-border shadow-card overflow-hidden flex flex-col w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-sm sm:max-w-none">
                          <div className="aspect-[4/3] bg-muted overflow-hidden">
                            {it.image
                              ? <ImageWithFallback src={it.image} alt={it.title} className="h-full w-full object-cover" />
                              : <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px] uppercase tracking-[0.2em]">{t("noImage")}</div>}
                          </div>
                          <div className="p-5 flex flex-col gap-2 flex-1">
                            <div className="font-serif text-lg">{it.title}</div>
                            {it.description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{it.description}</p>}
                            {(it.duration || it.included) && (
                              <ul className="space-y-1 text-[11px] text-muted-foreground mt-1">
                                {it.duration && <li className="flex items-start gap-2"><Clock className="h-3 w-3 mt-0.5 text-accent shrink-0" /><span>{it.duration}</span></li>}
                                {it.included && <li className="flex items-start gap-2"><span className="text-accent">✓</span><span>{it.included}</span></li>}
                              </ul>
                            )}
                            <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-3">
                              <div>
                                {it.price && <div className="eyebrow">{t("from")}</div>}
                                {it.price && <div className="font-serif text-lg text-primary">{normalizeCurrency(it.price, resort.currency)}</div>}
                              </div>
                              {it.bookingUrl ? (
                                <a
                                  href={it.bookingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent inline-flex items-center gap-1 hover:opacity-80"
                                >
                                  {t("bookNow")} <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => scrollToId("contact")}
                                  className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent inline-flex items-center gap-1 hover:opacity-80"
                                >
                                  {t("enquire")} <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ),
          video: () => !youtubeId ? null : (
            <section key="video" id="video" className="container py-12 sm:py-20 lg:py-24 max-w-5xl">
              <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3">{t("videoTourEyebrow")}</div>
                {videoTour?.title && (
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{videoTour.title}</h3>
                )}
                {videoTour?.subtitle && (
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground">{videoTour.subtitle}</p>
                )}
              </div>
              <div className="aspect-video w-full overflow-hidden bg-muted border border-border shadow-card">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title={videoTour?.title || `${resort.name} video tour`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  frameBorder={0}
                />
              </div>
            </section>
          ),
          
          faq: () => faqs.length === 0 ? null : (
            <section key="faq" id="faq" className="container py-12 sm:py-20 lg:py-24 max-w-3xl">
              <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3">{t("faqEyebrow")}</div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("faqHeading")}</h3>
              </div>
              <Accordion type="single" collapsible className="border-y border-border">
                {faqs.map((f) => (
                  <AccordionItem key={f.id} value={f.id} className="border-b last:border-b-0 border-border">
                    <AccordionTrigger className="font-serif text-base sm:text-lg lg:text-xl text-left py-5 sm:py-6 hover:no-underline hover:text-accent">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line pb-5 sm:pb-6">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ),
          map: () => !mapSrc ? null : (
            <section key="map" id="map" className="container py-12 sm:py-20 lg:py-24 max-w-5xl">
              <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3">{t("mapEyebrow")}</div>
                {mapEmbed?.title && (
                  <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{mapEmbed.title}</h3>
                )}
                {mapEmbed?.subtitle && (
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground">{mapEmbed.subtitle}</p>
                )}
              </div>
              <div className="aspect-video w-full overflow-hidden bg-muted border border-border shadow-card">
                <iframe
                  src={mapSrc}
                  title={mapEmbed?.title || `${resort.name} location map`}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </section>
          ),
          contact: () => (
            <section key="contact" id="contact" className="container py-12 sm:py-20 lg:py-24 max-w-3xl">
              <div className="text-center mb-8 sm:mb-10">
                <div className="hairline mx-auto mb-4" />
                <div className="eyebrow mb-3">{t("getInTouch")}</div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl">{t("contact")}</h3>
              </div>
              <div className="border-y border-border">
                {[
                  { icon: Mail, label: t("email"), value: resort.contact.email },
                  { icon: Phone, label: t("phone"), value: resort.contact.phone },
                  { icon: MessageCircle, label: t("whatsapp"), value: resort.contact.whatsapp },
                  { icon: MapPin, label: t("address"), value: resort.contact.address },
                  { icon: Globe, label: t("website"), value: resort.contact.website },
                ].filter((r) => r.value).map((row, i) => (
                  <div key={row.label} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <row.icon className="h-4 w-4 text-accent shrink-0" />
                      <span className="eyebrow">{row.label}</span>
                    </div>
                    <span className="text-sm sm:text-base sm:text-right break-words sm:break-normal">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ),
        };
                return order.map((id, i) => (
                  <MotionSection key={id} preset={resort.animationPreset} index={i}>
                    {renderers[id]?.()}
                  </MotionSection>
                ));
      })()}

      {/* FOOTER */}
      <footer id="contact" className="border-t border-border bg-background">
        <div className="container py-12 sm:py-14 lg:py-16">
          <div className="grid gap-10 md:gap-8 lg:gap-12 grid-cols-1 md:grid-cols-12 items-start">
            {/* Brand + socials */}
            <div className="space-y-4 md:col-span-12 lg:col-span-4">
              <div className="font-serif text-xl tracking-[0.3em]">{resort.name?.split(" ")[0]?.toUpperCase() || "RESORT"}</div>
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{resort.name} — {resort.location}</div>
              {socials.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {socials.map((s) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                       aria-label={s.platform === "Other" ? (s.label || "Link") : s.platform}
                       className="inline-flex h-9 w-9 items-center justify-center border border-border hover:border-accent hover:text-accent transition-colors">
                      <SocialIcon platform={s.platform} className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-4 md:col-span-6 lg:col-span-4 lg:order-3">
              <div className="eyebrow">{t("contact")}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {resort.contact.email && (
                  <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0 text-accent" /><a href={`mailto:${resort.contact.email}`} className="hover:text-accent break-all">{resort.contact.email}</a></li>
                )}
                {resort.contact.phone && (
                  <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0 text-accent" /><a href={`tel:${resort.contact.phone}`} className="hover:text-accent">{resort.contact.phone}</a></li>
                )}
                {resort.contact.address && (
                  <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-accent" /><span>{resort.contact.address}</span></li>
                )}
                {resort.contact.website && (
                  <li className="flex items-start gap-2"><Globe className="h-4 w-4 mt-0.5 shrink-0 text-accent" /><a href={resort.contact.website.startsWith("http") ? resort.contact.website : `https://${resort.contact.website}`} target="_blank" rel="noreferrer" className="hover:text-accent break-all">{resort.contact.website}</a></li>
                )}
              </ul>
            </div>

            {/* Quick links */}
            <div className="space-y-4 md:col-span-6 lg:col-span-2 lg:order-2">
              <div className="eyebrow">{t("quickLinks")}</div>
              <ul className="space-y-2 text-sm">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollToId(s.id)}
                      className="text-muted-foreground hover:text-accent transition-colors text-left"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter + Legal */}
            <div className="space-y-6 md:col-span-12 lg:col-span-2 lg:order-4">
              <div className="space-y-3">
                <div className="eyebrow">{t("newsletter")}</div>
                <p className="text-sm text-muted-foreground">{t("newsletterBlurb")}</p>
                <NewsletterForm />
              </div>
              <div className="space-y-2">
                <div className="eyebrow">{t("legal")}</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><a href="#privacy" className="hover:text-accent">{t("privacyPolicy")}</a></li>
                  <li><a href="#terms" className="hover:text-accent">{t("termsOfService")}</a></li>
                  <li><a href="#cookies" className="hover:text-accent">{t("cookiePolicy")}</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap justify-center">
              <span>© {new Date().getFullYear()} {resort.name || "Resort"} · {t("allRightsReserved")}</span>
              <span className="opacity-40">·</span>
              <button
                type="button"
                onClick={onAdminClick}
                className="uppercase tracking-[0.25em] text-[10px] hover:text-accent transition-colors"
              >
                {t("admin")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-accent transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
              {t("backToTop")}
            </button>
          </div>
        </div>
      </footer>

      <RoomDetailDialog room={selectedRoom} currency={resort.currency} onClose={() => setSelectedRoom(null)} />
      
      <GalleryDialog open={galleryOpen} images={resort.images} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}

// ---------- Social pill ----------
function SocialPill({ link }: { link: SocialLink }) {
  const label = link.platform === "Other" ? (link.label || "Link") : link.platform;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 border border-border bg-card hover:border-accent hover:text-accent transition-colors px-4 py-2"
    >
      <SocialIcon platform={link.platform} className="h-4 w-4 text-accent" />
      <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
    </a>
  );
}

// ---------- Gallery Dialog ----------
function GalleryDialog({ open, images, onClose }: { open: boolean; images: string[]; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="block max-w-5xl w-[calc(100vw-1.5rem)] sm:w-full bg-surface border-border max-h-[92vh] p-0 gap-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[92vh]">
          <div className="p-5 sm:p-8">
            <DialogHeader>
              <div className="eyebrow mb-2">{t("gallery")}</div>
              <DialogTitle className="font-serif text-2xl sm:text-3xl">{t("allImages")}</DialogTitle>
            </DialogHeader>
            {images.length === 0 ? (
              <p className="mt-6 text-muted-foreground text-sm">{t("noImagesYet")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                {images.map((src, i) => (
                  <div key={i} className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={src} alt={`Image ${i+1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Room detail dialog ----------
function RoomDetailDialog({ room, currency, onClose }: { room: Room | null; currency: string; onClose: () => void }) {
  const { t } = useI18n();
  if (!room) return null;
  const groups: { title: string; rows: [string, React.ReactNode][] }[] = [
    {
      title: t("size_layout"),
      rows: [
        [t("size"), room.size],
        [t("bed"), room.bedSize],
        [t("maxOccupancy"), `${room.maxAdults} ${t("adults")} · ${room.maxChildren} ${t("children")}`],
        [t("balconyPatio"), room.balcony],
      ],
    },
    {
      title: t("bathroom"),
      rows: [
        [t("shower"), room.showerType],
        [t("water"), room.waterPressure],
        [t("toiletPrivacy"), room.toiletPrivacy],
        [t("toiletries"), room.toiletries],
      ],
    },
    {
      title: t("tech_comfort"),
      rows: [
        [t("wifi"), room.wifiSpeed],
        [t("outlets"), room.outlets],
        [t("climateControl"), room.climateControl],
        [t("blackoutCurtains"), room.blackoutCurtains ? t("yes") : t("no")],
      ],
    },
    {
      title: t("money_rules"),
      rows: [
        [t("resortFee"), normalizeCurrency(room.resortFee, currency)],
        [t("incidentalDeposit"), normalizeCurrency(room.incidentalDeposit, currency)],
        [t("minibar"), normalizeCurrency(room.minibarPolicy, currency)],
        [t("earlyLate"), normalizeCurrency(room.earlyLateFee, currency)],
        [t("pets"), normalizeCurrency(room.petPolicy, currency)],
      ],
    },
    {
      title: t("noise_location"),
      rows: [
        [t("floorWing"), room.floorWing],
        [t("nearbyNoise"), room.nearbyNoise],
        [t("quietHours"), room.quietHours],
      ],
    },
    {
      title: t("accessibility"),
      rows: [
        [t("rollInShower"), room.rollInShower],
        [t("grabBars"), room.grabBars],
        [t("serviceAnimalArea"), room.serviceAnimalArea],
      ],
    },
    {
      title: t("inclusions"),
      rows: [
        [t("breakfast"), room.breakfastIncluded ? t("included") : t("notIncluded")],
        [t("poolTowels"), room.poolTowels ? t("included") : t("notIncluded")],
        [t("gymAccess"), room.gymAccess ? t("included") : t("notIncluded")],
      ],
    },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="block max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full bg-surface border-border max-h-[92vh] p-0 gap-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[92vh]">
          {room.images[0] && (
            <div className="w-full aspect-[16/9] bg-muted overflow-hidden">
              <img src={room.images[0]} alt={room.name} className="block h-full w-full object-cover" />
            </div>
          )}
          <div className="p-5 sm:p-8 space-y-6">
            <DialogHeader>
              <div className="eyebrow mb-2">{t("room")}</div>
              <DialogTitle className="font-serif text-2xl sm:text-3xl lg:text-4xl">{room.name}</DialogTitle>
            </DialogHeader>

            <p className="text-sm sm:text-base text-muted-foreground">{room.shortDescription}</p>

            {room.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {room.images.slice(1).map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden bg-muted">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {room.amenities.length > 0 && (
              <div>
                <div className="eyebrow mb-3">{t("roomAmenities")}</div>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((a) => (
                    <span key={a} className="text-[10px] sm:text-xs uppercase tracking-[0.15em] border border-border px-3 py-1 bg-card">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {groups.map((g) => (
              <div key={g.title}>
                <div className="eyebrow mb-3">{g.title}</div>
                <div className="border-y border-border">
                  {g.rows.map(([k, v], i) => (
                    <div key={k} className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                      <span className="text-sm text-muted-foreground">{k}</span>
                      <span className="text-sm sm:text-right break-words sm:max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-6">
              <div>
                <div className="eyebrow">{t("from")}</div>
                <div className="font-serif text-2xl sm:text-3xl text-primary">{currencySymbol(currency)}{room.pricePerNight.toLocaleString()}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em]">{t("perNight")}</div>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-[0.2em] text-xs px-6 py-5 w-full sm:w-auto">{t("bookRoom")}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
