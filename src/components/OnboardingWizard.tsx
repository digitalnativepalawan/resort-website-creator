import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  AMENITIES, Amenity, ResortData, Room, DEFAULT_ROOM, ROOM_AMENITIES, RoomAmenity,
  SOCIAL_PLATFORMS, SocialPlatform, SocialLink,
  FaqItem, VideoTour, SectionId, DEFAULT_SECTION_ORDER,
  HighlightItem, DEFAULT_HIGHLIGHTS,
  Restaurant, DEFAULT_RESTAURANT, MenuDish,
  ExperienceGroup, ExperienceCard, DEFAULT_EXPERIENCES,
} from "@/lib/resort-types";
import { toast } from "sonner";
import { X, Plus, ChevronLeft, ChevronRight, Trash2, ArrowUp, ArrowDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  open: boolean;
  initial: ResortData;
  onComplete: (data: ResortData) => void;
  onClose?: () => void;
  startStep?: number;
  submitLabel?: string;
  autoPublish?: boolean;
  onAutoPublishChange?: (v: boolean) => void;
  isAdmin?: boolean;
    adminPasskey?: string;
    onAdminPasskeyChange?: (v: string) => void;
    animationPreset?: "none" | "subtle" | "cinematic";
    onAnimationPresetChange?: (v: "none" | "subtle" | "cinematic") => void;
  }

const STEPS = ["Basic Info", "Description", "Amenities", "Images & Pricing", "Highlights", "Rooms", "Video Tour", "FAQ", "Map", "Restaurant", "Experiences", "Section Order", "Contact", "Style"];

const SECTION_LABEL: Record<SectionId, string> = {
  overview: "Overview & Hero",
  highlights: "Highlights Gallery",
  amenities: "Amenities",
  rooms: "Rooms & Suites",
  restaurant: "Restaurant",
  experiences: "Experiences",
  video: "Video Tour",
  faq: "FAQ",
  map: "Map",
  contact: "Contact",
};

const uid = () => Math.random().toString(36).slice(2, 9);
const IMAGE_BUCKET = "resort-images";

function cleanFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "image.jpg";
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
}

async function uploadOne(file: File, path: string, onProgress: (pct: number) => void): Promise<string> {
  // Indeterminate-ish progress: jump to 50% on start, 100% on completion.
  onProgress(10);
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) throw new Error(error.message || "Upload failed");
  onProgress(100);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadFiles(
  files: FileList | null,
  folder: string,
  onItemsChange?: (items: UploadItem[]) => void,
): Promise<string[]> {
  if (!files?.length) return [];
  const items: UploadItem[] = Array.from(files).map((f) => ({
    id: uid(), name: f.name, size: f.size, progress: 0, status: "uploading",
  }));
  const emit = () => onItemsChange?.([...items]);
  emit();
  const uploads = Array.from(files).map(async (file, index) => {
    const path = `${folder}/${Date.now()}-${index}-${uid()}-${cleanFileName(file.name)}`;
    try {
      const url = await uploadOne(file, path, (pct) => {
        items[index].progress = pct;
        emit();
      });
      items[index].status = "done";
      items[index].progress = 100;
      emit();
      return url;
    } catch (err) {
      items[index].status = "error";
      items[index].error = err instanceof Error ? err.message : "Upload failed";
      emit();
      throw err;
    }
  });
  return Promise.all(uploads);
}

interface ImageSpec {
  label: string;
  usage: string;
  formats: string;
  maxSizeMB: number;
  recommended: string;
  aspect: string;
}

const IMAGE_SPECS: Record<"hero" | "room", ImageSpec> = {
  hero: {
    label: "Hero / cover image",
    usage: "Full-width background on the homepage and gallery thumbnails.",
    formats: "JPG, PNG, or WebP",
    maxSizeMB: 5,
    recommended: "2400 × 1600 px (min 1600 × 1067)",
    aspect: "3:2 landscape",
  },
  room: {
    label: "Room gallery image",
    usage: "Photos shown in the room detail gallery.",
    formats: "JPG, PNG, or WebP",
    maxSizeMB: 5,
    recommended: "1600 × 1067 px",
    aspect: "3:2 landscape",
  },
};

const ACCEPTED_MIME = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ImageHelpPanel({ spec }: { spec: ImageSpec }) {
  return (
    <div className="border border-border bg-muted/40 p-3 text-xs space-y-1.5">
      <div className="eyebrow text-foreground">{spec.label}</div>
      <p className="text-muted-foreground">{spec.usage}</p>
      <ul className="space-y-0.5 text-muted-foreground">
        <li><span className="text-foreground">Format:</span> {spec.formats}</li>
        <li><span className="text-foreground">Max size:</span> {spec.maxSizeMB} MB</li>
        <li><span className="text-foreground">Recommended:</span> {spec.recommended}</li>
        <li><span className="text-foreground">Aspect:</span> {spec.aspect}</li>
      </ul>
    </div>
  );
}

function validateImageFiles(files: FileList | null, spec: ImageSpec): File[] {
  if (!files?.length) return [];
  const accepted: File[] = [];
  for (const f of Array.from(files)) {
    if (!ACCEPTED_TYPES.has(f.type)) {
      toast.error(`Unsupported format: ${f.name}`, { description: `Please use ${spec.formats}.` });
      continue;
    }
    if (f.size > spec.maxSizeMB * 1024 * 1024) {
      toast.warning(`${f.name} is large`, {
        description: `${(f.size / 1024 / 1024).toFixed(1)} MB exceeds the ${spec.maxSizeMB} MB recommendation. It will still upload but may load slowly.`,
      });
    }
    accepted.push(f);
  }
  return accepted;
}

function filesToList(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt.files;
}

function UploadProgressList({ items, onClear }: { items: UploadItem[]; onClear?: () => void }) {
  if (!items.length) return null;
  const allDone = items.every((i) => i.status !== "uploading");
  return (
    <div className="space-y-2 border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-muted-foreground">
          {allDone ? "Uploads complete" : `Uploading ${items.filter(i => i.status === "uploading").length} of ${items.length}…`}
        </span>
        {allDone && onClear && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        )}
      </div>
      {items.map((it) => (
        <div key={it.id} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {it.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
              {it.status === "done" && <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />}
              {it.status === "error" && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
              <span className="truncate">{it.name}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {it.status === "error" ? "Failed" : `${it.progress}%`}
            </span>
          </div>
          <Progress value={it.progress} className={`h-1 ${it.status === "error" ? "opacity-50" : ""}`} />
          {it.error && <p className="text-[10px] text-destructive">{it.error}</p>}
        </div>
      ))}
    </div>
  );
}

export function OnboardingWizard({ open, initial, onComplete, onClose, startStep, submitLabel, autoPublish, onAutoPublishChange, isAdmin, adminPasskey, onAdminPasskeyChange, animationPreset, onAnimationPresetChange }: Props) {
  const [step, setStep] = useState(startStep ?? 0);
  const [data, setData] = useState<ResortData>(initial);
  const [imageUrl, setImageUrl] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [customAmenity, setCustomAmenity] = useState("");
  const [heroUploads, setHeroUploads] = useState<UploadItem[]>([]);
  

  // Refresh local state each time the dialog opens
  useEffect(() => {
    if (open) {
      setStep(startStep ?? 0);
      setData(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = <K extends keyof ResortData>(k: K, v: ResortData[K]) => setData((d) => ({ ...d, [k]: v }));

  const toggleAmenity = (a: string) => {
    update("amenities", (data.amenities as string[]).includes(a) ? (data.amenities as string[]).filter((x) => x !== a) as Amenity[] : [...data.amenities, a as Amenity]);
  };
  const addCustomAmenity = () => {
    const v = customAmenity.trim();
    if (!v) return;
    if (!(data.amenities as string[]).includes(v)) update("amenities", [...data.amenities, v as Amenity]);
    setCustomAmenity("");
  };

  const addImageUrl = () => {
    if (!imageUrl.trim()) return;
    update("images", [...data.images, imageUrl.trim()]);
    setImageUrl("");
  };

  const handleFiles = async (files: FileList | null) => {
    const valid = validateImageFiles(files, IMAGE_SPECS.hero);
    if (!valid.length) return;
    try {
      const urls = await uploadFiles(filesToList(valid), "hero", setHeroUploads);
      if (urls.length) update("images", [...data.images, ...urls]);
    } catch (error) {
      console.error("[resort] image upload failed", error);
      toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const removeImage = (i: number) => update("images", data.images.filter((_, idx) => idx !== i));

  // Rooms
  const saveRoom = (room: Room) => {
    const exists = data.rooms.find((r) => r.id === room.id);
    update("rooms", exists ? data.rooms.map((r) => (r.id === room.id ? room : r)) : [...data.rooms, room]);
    setEditingRoom(null);
  };
  const deleteRoom = (id: string) => update("rooms", data.rooms.filter((r) => r.id !== id));

  // Experiences removed

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onComplete(data));
  const back = () => step > 0 && setStep(step - 1);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
        <DialogContent className="max-w-2xl bg-surface border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="eyebrow mb-2">Step {step + 1} of {STEPS.length}</div>
            <DialogTitle className="font-serif text-3xl">{STEPS[step]}</DialogTitle>
            <div className="flex gap-1 mt-4">
              {STEPS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  title={label}
                  className={`h-0.5 flex-1 transition-colors ${i <= step ? "bg-accent" : "bg-border"} hover:bg-primary`}
                />
              ))}
            </div>
          </DialogHeader>

          <div className="py-6 space-y-5">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label className="eyebrow">Resort Name</Label>
                  <Input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="BAIA Palawan Island Resort" />
                </div>
                <div className="space-y-2">
                  <Label className="eyebrow">Location</Label>
                  <Input value={data.location} onChange={(e) => update("location", e.target.value)} placeholder="Palawan, Philippines" />
                </div>
                <div className="space-y-2">
                  <Label className="eyebrow">Tagline</Label>
                  <Input value={data.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="A paragon of luxury" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><Label className="eyebrow">Guests</Label><Input type="number" value={data.guests} onChange={(e) => update("guests", +e.target.value)} /></div>
                  <div><Label className="eyebrow">Bedrooms</Label><Input type="number" value={data.bedrooms} onChange={(e) => update("bedrooms", +e.target.value)} /></div>
                  <div><Label className="eyebrow">Bathrooms</Label><Input type="number" value={data.bathrooms} onChange={(e) => update("bathrooms", +e.target.value)} /></div>
                  <div><Label className="eyebrow">Area</Label><Input value={data.area} onChange={(e) => update("area", e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label className="eyebrow">View</Label>
                  <Input value={data.view} onChange={(e) => update("view", e.target.value)} />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="space-y-2">
                <Label className="eyebrow">About the Resort</Label>
                <Textarea rows={10} value={data.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the resort..." />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from(new Set([...AMENITIES, ...data.amenities] as string[])).map((a) => (
                    <label key={a} className="flex items-center gap-3 border border-border p-3 cursor-pointer hover:border-accent transition-colors bg-card">
                      <Checkbox checked={(data.amenities as string[]).includes(a)} onCheckedChange={() => toggleAmenity(a)} />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="eyebrow">Other — add your own</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Rooftop Bar"
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomAmenity())}
                    />
                    <Button type="button" variant="outline" onClick={addCustomAmenity}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Add as many custom amenities as you need.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label className="eyebrow">Upload Images</Label>
                  <ImageHelpPanel spec={IMAGE_SPECS.hero} />
                  <Input type="file" accept={ACCEPTED_MIME} multiple onChange={(e) => handleFiles(e.target.files)} />
                  <UploadProgressList items={heroUploads} onClear={() => setHeroUploads([])} />
                  <div className="flex gap-2">
                    <Input placeholder="Or paste image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())} />
                    <Button type="button" variant="outline" onClick={addImageUrl}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {data.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {data.images.map((src, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden bg-muted">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-background/90 p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 4 && (() => {
              const list: HighlightItem[] = (data.highlights && data.highlights.length > 0)
                ? data.highlights
                : [...DEFAULT_HIGHLIGHTS];
              const setList = (next: HighlightItem[]) => update("highlights", next);
              const patch = (idx: number, p: Partial<HighlightItem>) =>
                setList(list.map((h, i) => i === idx ? { ...h, ...p } : h));
              const remove = (idx: number) => setList(list.filter((_, i) => i !== idx));
              const add = () => setList([...list, { id: uid(), image: "", title: "", caption: "" }]);
              const uploadFor = async (idx: number, files: FileList | null) => {
                const valid = validateImageFiles(files, IMAGE_SPECS.hero);
                if (!valid.length) return;
                try {
                  const urls = await uploadFiles(filesToList(valid), "highlights");
                  if (urls[0]) patch(idx, { image: urls[0] });
                } catch (error) {
                  toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
                }
              };
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Edit the three "Experience the unforgettable" highlight cards. Each has an image, a title, and a short caption.</p>
                  {list.map((h, idx) => (
                    <div key={h.id} className="border border-border bg-card p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="eyebrow text-muted-foreground">Highlight {idx + 1}</span>
                        <Button size="sm" variant="ghost" onClick={() => remove(idx)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
                        <div className="aspect-[4/5] bg-muted overflow-hidden">
                          {h.image
                            ? <img src={h.image} alt="" className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-[0.2em]">No image</div>}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Title</Label>
                            <Input value={h.title} placeholder="e.g. Private dock" onChange={(e) => patch(idx, { title: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Caption</Label>
                            <Input value={h.caption} placeholder="e.g. Step from water to villa" onChange={(e) => patch(idx, { caption: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Image</Label>
                            <Input type="file" accept={ACCEPTED_MIME} onChange={(e) => uploadFor(idx, e.target.files)} />
                            <Input placeholder="Or paste image URL" value={h.image} onChange={(e) => patch(idx, { image: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={add}>
                    <Plus className="h-4 w-4 mr-1" /> Add Highlight
                  </Button>
                  <p className="text-xs text-muted-foreground">Only the first 3 highlights are displayed on the site.</p>
                </div>
              );
            })()}

            {step === 5 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Add the rooms guests can book. Each room opens a detailed editor.</p>
                {data.rooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border border-border bg-card p-4">
                    <div>
                      <div className="font-serif text-lg">{r.name || "Untitled room"}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-[0.2em]">{r.size} · {r.bedSize}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingRoom(r)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteRoom(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setEditingRoom({ ...DEFAULT_ROOM, id: uid() })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Room
                </Button>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Embed a YouTube video tour. Paste any YouTube link (watch, youtu.be, embed, or shorts).</p>
                <label className="flex items-center gap-3 border border-border bg-card p-3 cursor-pointer">
                  <Checkbox
                    checked={!!data.videoTour?.enabled}
                    onCheckedChange={(v) => update("videoTour", { ...(data.videoTour ?? { enabled: false, youtubeUrl: "", title: "", subtitle: "" }), enabled: !!v })}
                  />
                  <span className="text-sm">Show video tour section on the site</span>
                </label>
                <div className="space-y-2">
                  <Label className="eyebrow">YouTube URL</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={data.videoTour?.youtubeUrl ?? ""}
                    onChange={(e) => update("videoTour", { ...(data.videoTour ?? { enabled: true, youtubeUrl: "", title: "", subtitle: "" }), youtubeUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="eyebrow">Heading</Label>
                    <Input
                      placeholder="A cinematic tour"
                      value={data.videoTour?.title ?? ""}
                      onChange={(e) => update("videoTour", { ...(data.videoTour ?? { enabled: true, youtubeUrl: "", title: "", subtitle: "" }), title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="eyebrow">Subtitle</Label>
                    <Input
                      placeholder="Step inside the resort"
                      value={data.videoTour?.subtitle ?? ""}
                      onChange={(e) => update("videoTour", { ...(data.videoTour ?? { enabled: true, youtubeUrl: "", title: "", subtitle: "" }), subtitle: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tip: use the “Section Order” step to position the video above or below any other section.</p>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Add as many questions and answers as you like.</p>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => update("faqs", [...(data.faqs ?? []), { id: uid(), question: "", answer: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add FAQ
                  </Button>
                </div>
                {(data.faqs ?? []).map((f, idx) => {
                  const list = data.faqs ?? [];
                  const patch = (p: Partial<FaqItem>) => update("faqs", list.map((x, i) => i === idx ? { ...x, ...p } : x));
                  const remove = () => update("faqs", list.filter((_, i) => i !== idx));
                  const move = (dir: -1 | 1) => {
                    const j = idx + dir;
                    if (j < 0 || j >= list.length) return;
                    const next = [...list];
                    [next[idx], next[j]] = [next[j], next[idx]];
                    update("faqs", next);
                  };
                  return (
                    <div key={f.id} className="border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="eyebrow text-muted-foreground">Question {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => move(-1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => move(1)} disabled={idx === list.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <Input placeholder="Question" value={f.question} onChange={(e) => patch({ question: e.target.value })} />
                      <Textarea rows={3} placeholder="Answer" value={f.answer} onChange={(e) => patch({ answer: e.target.value })} />
                    </div>
                  );
                })}
                {(data.faqs ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No FAQs yet — click "Add FAQ" to create one.</p>
                )}
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Embed a Google Map. Paste a Google Maps embed URL, the full {`<iframe>`} snippet from “Share → Embed a map”, or a regular Google Maps share link.</p>
                <label className="flex items-center gap-3 border border-border bg-card p-3 cursor-pointer">
                  <Checkbox
                    checked={!!data.mapEmbed?.enabled}
                    onCheckedChange={(v) => update("mapEmbed", { ...(data.mapEmbed ?? { enabled: false, embedUrl: "", title: "", subtitle: "" }), enabled: !!v })}
                  />
                  <span className="text-sm">Show map section on the site</span>
                </label>
                <div className="space-y-2">
                  <Label className="eyebrow">Google Maps embed URL or {`<iframe>`}</Label>
                  <Textarea
                    rows={4}
                    placeholder='https://www.google.com/maps/embed?pb=... or paste full <iframe ...> code'
                    value={data.mapEmbed?.embedUrl ?? ""}
                    onChange={(e) => update("mapEmbed", { ...(data.mapEmbed ?? { enabled: true, embedUrl: "", title: "", subtitle: "" }), embedUrl: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="eyebrow">Heading</Label>
                    <Input
                      placeholder="Find us"
                      value={data.mapEmbed?.title ?? ""}
                      onChange={(e) => update("mapEmbed", { ...(data.mapEmbed ?? { enabled: true, embedUrl: "", title: "", subtitle: "" }), title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="eyebrow">Subtitle</Label>
                    <Input
                      placeholder="Plan your visit"
                      value={data.mapEmbed?.subtitle ?? ""}
                      onChange={(e) => update("mapEmbed", { ...(data.mapEmbed ?? { enabled: true, embedUrl: "", title: "", subtitle: "" }), subtitle: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tip: in Google Maps, click <em>Share → Embed a map</em>, copy the HTML, and paste it above. Use the “Section Order” step to position the map.</p>
              </div>
            )}

            {step === 9 && (() => {
              const r: Restaurant = data.restaurant ?? { ...DEFAULT_RESTAURANT };
              const setR = (patch: Partial<Restaurant>) => update("restaurant", { ...r, ...patch });
              const uploadHero = async (files: FileList | null) => {
                const valid = validateImageFiles(files, IMAGE_SPECS.hero);
                if (!valid.length) return;
                try {
                  const urls = await uploadFiles(filesToList(valid), "restaurant");
                  if (urls[0]) setR({ heroImage: urls[0] });
                } catch (error) {
                  toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
                }
              };
              const uploadGallery = async (files: FileList | null) => {
                const valid = validateImageFiles(files, IMAGE_SPECS.hero);
                if (!valid.length) return;
                try {
                  const urls = await uploadFiles(filesToList(valid), "restaurant/gallery");
                  if (urls.length) setR({ gallery: [...(r.gallery ?? []), ...urls] });
                } catch (error) {
                  toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
                }
              };
              const uploadDishImage = async (idx: number, files: FileList | null) => {
                const valid = validateImageFiles(files, IMAGE_SPECS.room);
                if (!valid.length) return;
                try {
                  const urls = await uploadFiles(filesToList(valid), "restaurant/menu");
                  if (urls[0]) {
                    const next = [...(r.menu ?? [])];
                    next[idx] = { ...next[idx], image: urls[0] };
                    setR({ menu: next });
                  }
                } catch (error) {
                  toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
                }
              };
              const patchDish = (idx: number, p: Partial<MenuDish>) => {
                const next = (r.menu ?? []).map((d, i) => i === idx ? { ...d, ...p } : d);
                setR({ menu: next });
              };
              return (
                <div className="space-y-5">
                  <label className="flex items-center gap-3 border border-border bg-card p-3 cursor-pointer">
                    <Checkbox checked={!!r.enabled} onCheckedChange={(v) => setR({ enabled: !!v })} />
                    <span className="text-sm">Show restaurant section on the site</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="eyebrow">Restaurant name</Label>
                      <Input value={r.name} placeholder="e.g. Saltbreeze" onChange={(e) => setR({ name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="eyebrow">Tagline</Label>
                      <Input value={r.tagline} placeholder="A taste of the islands" onChange={(e) => setR({ tagline: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="eyebrow">Description</Label>
                    <Textarea rows={4} value={r.description} placeholder="Set the scene…" onChange={(e) => setR({ description: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label className="eyebrow">Hero image</Label>
                    <Input type="file" accept={ACCEPTED_MIME} onChange={(e) => uploadHero(e.target.files)} />
                    <Input placeholder="Or paste image URL" value={r.heroImage} onChange={(e) => setR({ heroImage: e.target.value })} />
                    {r.heroImage && (
                      <div className="aspect-[4/3] max-w-xs overflow-hidden bg-muted">
                        <img src={r.heroImage} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div className="space-y-2">
                      <Label className="eyebrow">Cuisine</Label>
                      <Input value={r.cuisine} placeholder="Mediterranean · Seafood" onChange={(e) => setR({ cuisine: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="eyebrow">Hours</Label>
                      <Input value={r.hours} placeholder="Daily, 7:00 – 23:00" onChange={(e) => setR({ hours: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="eyebrow">Dress code</Label>
                      <Input value={r.dressCode} placeholder="Smart casual" onChange={(e) => setR({ dressCode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="eyebrow">Reservation info</Label>
                      <Input value={r.reservation} placeholder="Recommended · book 24h ahead" onChange={(e) => setR({ reservation: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="eyebrow">Menu highlights</Label>
                      <Button
                        type="button" size="sm" variant="outline"
                        onClick={() => setR({ menu: [...(r.menu ?? []), { id: uid(), name: "", description: "", price: "", image: "" }] })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Dish
                      </Button>
                    </div>
                    {(r.menu ?? []).map((dish, idx) => (
                      <div key={dish.id} className="border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3">
                        <div className="aspect-square bg-muted overflow-hidden">
                          {dish.image
                            ? <img src={dish.image} alt="" className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-[0.2em]">No image</div>}
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                            <Input value={dish.name} placeholder="Dish name" onChange={(e) => patchDish(idx, { name: e.target.value })} />
                            <Input value={dish.price} placeholder="Price" onChange={(e) => patchDish(idx, { price: e.target.value })} />
                          </div>
                          <Textarea rows={2} value={dish.description} placeholder="Short description" onChange={(e) => patchDish(idx, { description: e.target.value })} />
                          <div className="flex items-center gap-2">
                            <Input type="file" accept={ACCEPTED_MIME} onChange={(e) => uploadDishImage(idx, e.target.files)} className="flex-1" />
                            <Button size="sm" variant="ghost" onClick={() => setR({ menu: (r.menu ?? []).filter((_, i) => i !== idx) })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input value={dish.image} placeholder="Or paste image URL" onChange={(e) => patchDish(idx, { image: e.target.value })} />
                        </div>
                      </div>
                    ))}
                    {(r.menu ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No dishes yet — click "Add Dish" to create one.</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="eyebrow">Photo gallery</Label>
                    </div>
                    <Input type="file" accept={ACCEPTED_MIME} multiple onChange={(e) => uploadGallery(e.target.files)} />
                    {(r.gallery ?? []).length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {r.gallery.map((src, i) => (
                          <div key={i} className="relative aspect-square overflow-hidden bg-muted">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button onClick={() => setR({ gallery: r.gallery.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-background/90 p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {step === 10 && (() => {
              const groups: ExperienceGroup[] = (data.experienceCategories && data.experienceCategories.length > 0)
                ? data.experienceCategories
                : [...DEFAULT_EXPERIENCES];
              const setGroups = (next: ExperienceGroup[]) => update("experienceCategories", next);
              const patchGroup = (gid: string, p: Partial<ExperienceGroup>) =>
                setGroups(groups.map((g) => g.id === gid ? { ...g, ...p } : g));
              const removeGroup = (gid: string) =>
                setGroups(groups.filter((g) => g.id !== gid));
              const addGroup = () =>
                setGroups([...groups, { id: uid(), name: "New category", items: [] }]);
              const addItem = (gid: string) =>
                patchGroup(gid, { items: [...(groups.find((g) => g.id === gid)?.items ?? []), { id: uid(), title: "", description: "", price: "", image: "", duration: "", included: "", bookingUrl: "" }] });
              const patchItem = (gid: string, iid: string, p: Partial<ExperienceCard>) => {
                const g = groups.find((x) => x.id === gid);
                if (!g) return;
                patchGroup(gid, { items: g.items.map((it) => it.id === iid ? { ...it, ...p } : it) });
              };
              const removeItem = (gid: string, iid: string) => {
                const g = groups.find((x) => x.id === gid);
                if (!g) return;
                patchGroup(gid, { items: g.items.filter((it) => it.id !== iid) });
              };
              const uploadItemImage = async (gid: string, iid: string, files: FileList | null) => {
                const valid = validateImageFiles(files, IMAGE_SPECS.room);
                if (!valid.length) return;
                try {
                  const urls = await uploadFiles(filesToList(valid), "experiences");
                  if (urls[0]) patchItem(gid, iid, { image: urls[0] });
                } catch (error) {
                  toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
                }
              };
              return (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">Group your offerings into custom categories — Tours, Island Hopping, Rentals, Transportation, or anything else. Add items inside each.</p>
                  {groups.map((g) => (
                    <div key={g.id} className="border border-border bg-card p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={g.name}
                          placeholder="Category name"
                          onChange={(e) => patchGroup(g.id, { name: e.target.value })}
                          className="font-serif"
                        />
                        <Button size="sm" variant="outline" onClick={() => addItem(g.id)}>
                          <Plus className="h-4 w-4 mr-1" /> Item
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeGroup(g.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {g.items.length === 0 && (
                        <p className="text-xs text-muted-foreground italic pl-1">No items yet in this category.</p>
                      )}
                      {g.items.map((it) => (
                        <div key={it.id} className="border border-border bg-background p-3 grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3">
                          <div className="aspect-square bg-muted overflow-hidden">
                            {it.image
                              ? <img src={it.image} alt="" className="h-full w-full object-cover" />
                              : <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-[0.2em]">No image</div>}
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                              <Input value={it.title} placeholder="Title" onChange={(e) => patchItem(g.id, it.id, { title: e.target.value })} />
                              <Input value={it.price} placeholder="Price (e.g. 80 / pax)" onChange={(e) => patchItem(g.id, it.id, { price: e.target.value })} />
                            </div>
                            <Textarea rows={2} value={it.description} placeholder="Short description" onChange={(e) => patchItem(g.id, it.id, { description: e.target.value })} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input value={it.duration} placeholder="Duration (e.g. 4 hours)" onChange={(e) => patchItem(g.id, it.id, { duration: e.target.value })} />
                              <Input value={it.included} placeholder="What's included" onChange={(e) => patchItem(g.id, it.id, { included: e.target.value })} />
                            </div>
                            <Input value={it.bookingUrl} placeholder="Booking / contact link (optional)" onChange={(e) => patchItem(g.id, it.id, { bookingUrl: e.target.value })} />
                            <div className="flex items-center gap-2">
                              <Input type="file" accept={ACCEPTED_MIME} onChange={(e) => uploadItemImage(g.id, it.id, e.target.files)} className="flex-1" />
                              <Input value={it.image} placeholder="Or paste image URL" onChange={(e) => patchItem(g.id, it.id, { image: e.target.value })} className="flex-1" />
                              <Button size="sm" variant="ghost" onClick={() => removeItem(g.id, it.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addGroup}>
                    <Plus className="h-4 w-4 mr-1" /> Add Category
                  </Button>
                </div>
              );
            })()}

            {step === 11 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Drag-free reordering: use the arrows to move sections up or down. The hero/overview is usually best left at the top.</p>
                {(() => {
                  // Merge saved order with any newly-introduced sections.
                  // New sections are inserted at their DEFAULT position (not blindly appended at the end),
                  // so e.g. Contact/Map/FAQ stay at the bottom when Restaurant/Experiences are added later.
                  const saved = (data.sectionOrder ?? []).filter((id) => DEFAULT_SECTION_ORDER.includes(id as SectionId)) as SectionId[];
                  const seen = new Set<SectionId>();
                  const dedupedSaved = saved.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
                  const missing = DEFAULT_SECTION_ORDER.filter((id) => !dedupedSaved.includes(id));
                  const merged: SectionId[] = [...dedupedSaved];
                  for (const id of missing) {
                    const defaultIdx = DEFAULT_SECTION_ORDER.indexOf(id);
                    // Find the nearest preceding sibling from default order that's already in merged
                    let insertAt = merged.length;
                    for (let i = defaultIdx - 1; i >= 0; i--) {
                      const prev = DEFAULT_SECTION_ORDER[i];
                      const pos = merged.indexOf(prev);
                      if (pos !== -1) { insertAt = pos + 1; break; }
                    }
                    merged.splice(insertAt, 0, id);
                  }
                  const current = merged;
                  const commit = (next: SectionId[]) => update("sectionOrder", next);
                  const move = (idx: number, dir: -1 | 1) => {
                    const j = idx + dir;
                    if (j < 0 || j >= current.length) return;
                    const next = [...current];
                    [next[idx], next[j]] = [next[j], next[idx]];
                    commit(next);
                  };
                  const moveToTop = (idx: number) => {
                    if (idx === 0) return;
                    const next = [...current];
                    const [it] = next.splice(idx, 1);
                    next.unshift(it);
                    commit(next);
                  };
                  const moveToBottom = (idx: number) => {
                    if (idx === current.length - 1) return;
                    const next = [...current];
                    const [it] = next.splice(idx, 1);
                    next.push(it);
                    commit(next);
                  };
                  return current.map((id, idx) => (
                    <div key={id} className="flex items-center justify-between gap-3 border border-border bg-card p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="eyebrow text-muted-foreground w-6 text-right">{idx + 1}</span>
                        <span className="font-serif text-base sm:text-lg truncate">{SECTION_LABEL[id]}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => moveToTop(idx)} disabled={idx === 0} title="Move to top">⤒</Button>
                        <Button size="sm" variant="outline" onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up"><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => move(idx, 1)} disabled={idx === current.length - 1} title="Move down"><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => moveToBottom(idx)} disabled={idx === current.length - 1} title="Move to bottom">⤓</Button>
                      </div>
                    </div>
                  ));
                })()}
                <Button type="button" variant="ghost" size="sm" onClick={() => update("sectionOrder", [...DEFAULT_SECTION_ORDER])}>
                  Reset to default order
                </Button>
              </div>
            )}

            {step === 12 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["email","phone","whatsapp","address","website"] as const).map((k) => (
                    <div key={k} className="space-y-2">
                      <Label className="eyebrow">{k}</Label>
                      <Input
                        value={data.contact[k] ?? ""}
                        onChange={(e) => update("contact", { ...data.contact, [k]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="eyebrow">Social Media Links</Label>
                      <p className="text-xs text-muted-foreground mt-1">Add as many as you like — Facebook, X, TikTok, YouTube, LinkedIn, Other…</p>
                    </div>
                    <Button
                      type="button" size="sm" variant="outline"
                      onClick={() => update("contact", { ...data.contact, socials: [...(data.contact.socials ?? []), { id: uid(), platform: "Instagram" as SocialPlatform, url: "" }] })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Link
                    </Button>
                  </div>

                  {(data.contact.socials ?? []).map((s, idx) => {
                    const patch = (p: Partial<SocialLink>) => {
                      const next = (data.contact.socials ?? []).map((x, i) => i === idx ? { ...x, ...p } : x);
                      update("contact", { ...data.contact, socials: next });
                    };
                    const remove = () => {
                      const next = (data.contact.socials ?? []).filter((_, i) => i !== idx);
                      update("contact", { ...data.contact, socials: next });
                    };
                    return (
                      <div key={s.id} className="border border-border bg-card p-3 grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5 sm:col-span-3 space-y-1">
                          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Platform</Label>
                          <Select value={s.platform} onValueChange={(v) => patch({ platform: v as SocialPlatform })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {s.platform === "Other" && (
                          <div className="col-span-7 sm:col-span-3 space-y-1">
                            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Label</Label>
                            <Input value={s.label ?? ""} placeholder="e.g. Vimeo" onChange={(e) => patch({ label: e.target.value })} />
                          </div>
                        )}
                        <div className={`col-span-12 ${s.platform === "Other" ? "sm:col-span-5" : "sm:col-span-8"} space-y-1`}>
                          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">URL</Label>
                          <Input value={s.url} placeholder="https://…" onChange={(e) => patch({ url: e.target.value })} />
                        </div>
                        <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="eyebrow">Public Website URL</Label>
                  <p className="text-xs text-muted-foreground">
                    The canonical URL where this resort lives (e.g. <span className="font-mono">https://baia-palawan.com</span>).
                    Used for SEO tags, social previews, and JSON-LD. Leave blank to use the current browser URL.
                  </p>
                  <Input
                    value={data.canonicalUrl ?? ""}
                    onChange={(e) => update("canonicalUrl", e.target.value)}
                    placeholder="https://your-resort.com"
                    inputMode="url"
                  />
                  <div className="border border-border bg-muted/40 p-3 text-xs space-y-1.5">
                    <div className="eyebrow text-foreground">Connecting the actual domain</div>
                    <p className="text-muted-foreground">
                      This field only sets the URL used in metadata — it does <em>not</em> route DNS.
                      To make <span className="font-mono">your-resort.com</span> actually serve this site,
                      open <span className="font-medium text-foreground">Lovable → Project Settings → Domains</span>,
                      then either <span className="font-medium text-foreground">Connect Domain</span> (point an A record to <span className="font-mono">185.158.133.1</span>)
                      or <span className="font-medium text-foreground">Buy new domain</span>. SSL is provisioned automatically.
                    </p>
                  </div>
                </div>

                {isAdmin && onAdminPasskeyChange && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <Label className="eyebrow">Admin Passkey</Label>
                    <p className="text-xs text-muted-foreground">Used to unlock admin mode on this site. Change it for each remixed project.</p>
                    <Input
                      value={adminPasskey ?? ""}
                      onChange={(e) => onAdminPasskeyChange(e.target.value)}
                      placeholder="e.g. 5309"
                      className="max-w-xs"
                    />
                  </div>
                )}
                              </div>
                            )}
                            {step === 13 && onAnimationPresetChange && (
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Choose how your site animates as visitors scroll.</p>
                                <div className="flex flex-col gap-2">
                                  {([
                                    { value: "none", label: "None", desc: "No animation — static layout" },
                                    { value: "subtle", label: "Subtle", desc: "Sections fade in as you scroll" },
                                    { value: "cinematic", label: "Cinematic", desc: "Staggered reveals with parallax hero" },
                                  ] as const).map((p) => (
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
                                        name="animWizard"
                                        value={p.value}
                                        checked={(animationPreset || "none") === p.value}
                                        onChange={() => onAnimationPresetChange(p.value)}
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
                          </div>

                          <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
            {step === STEPS.length - 1 && onAutoPublishChange ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={!!autoPublish}
                  onCheckedChange={(v) => onAutoPublishChange(v === true)}
                  aria-label="Auto-publish to cloud when finishing"
                />
                <span className="uppercase tracking-[0.2em] text-[10px]">Auto-publish to cloud on finish</span>
              </label>
            ) : <span className="hidden sm:block" />}
            <div className="flex justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={next} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-[0.2em] text-xs px-6">
                {step === STEPS.length - 1 ? (submitLabel ?? "Publish Resort") : "Continue"}
                {step < STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingRoom && (
        <RoomEditor
          room={editingRoom}
          onSave={saveRoom}
          onCancel={() => setEditingRoom(null)}
        />
      )}
    </>
  );
}

function RoomEditor({ room, onSave, onCancel }: { room: Room; onSave: (r: Room) => void; onCancel: () => void }) {
  const [r, setR] = useState<Room>(room);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const set = <K extends keyof Room>(k: K, v: Room[K]) => setR((p) => ({ ...p, [k]: v }));

  const toggle = (a: RoomAmenity) =>
    set("amenities", r.amenities.includes(a) ? r.amenities.filter((x) => x !== a) : [...r.amenities, a]);

  const addImages = async (files: FileList | null) => {
    const valid = validateImageFiles(files, IMAGE_SPECS.room);
    if (!valid.length) return;
    try {
      const urls = await uploadFiles(filesToList(valid), `rooms/${r.id || uid()}`, setUploads);
      if (urls.length) set("images", [...r.images, ...urls]);
    } catch (error) {
      console.error("[resort] room image upload failed", error);
      toast.error("Image upload failed", { description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="eyebrow mb-2">Room</div>
          <DialogTitle className="font-serif text-2xl">{r.name || "New room"}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-5">
          <Section title="Essentials">
            <Field label="Name"><Input value={r.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Short description" full>
              <Textarea rows={2} value={r.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field label="Size"><Input value={r.size} onChange={(e) => set("size", e.target.value)} /></Field>
            <Field label="Bed size"><Input value={r.bedSize} onChange={(e) => set("bedSize", e.target.value)} /></Field>
            <Field label="Max adults"><Input type="number" value={r.maxAdults} onChange={(e) => set("maxAdults", +e.target.value)} /></Field>
            <Field label="Max children"><Input type="number" value={r.maxChildren} onChange={(e) => set("maxChildren", +e.target.value)} /></Field>
            <Field label="Balcony / patio" full><Input value={r.balcony} onChange={(e) => set("balcony", e.target.value)} /></Field>
            <Field label="Price per night"><Input type="number" value={r.pricePerNight} onChange={(e) => set("pricePerNight", +e.target.value)} /></Field>
          </Section>

          <Section title="Bathroom">
            <Field label="Shower type"><Input value={r.showerType} onChange={(e) => set("showerType", e.target.value)} /></Field>
            <Field label="Water pressure"><Input value={r.waterPressure} onChange={(e) => set("waterPressure", e.target.value)} /></Field>
            <Field label="Toilet privacy"><Input value={r.toiletPrivacy} onChange={(e) => set("toiletPrivacy", e.target.value)} /></Field>
            <Field label="Toiletries brand"><Input value={r.toiletries} onChange={(e) => set("toiletries", e.target.value)} /></Field>
          </Section>

          <Section title="Tech & Comfort">
            <Field label="Wi-Fi speed"><Input value={r.wifiSpeed} onChange={(e) => set("wifiSpeed", e.target.value)} /></Field>
            <Field label="Outlets / USB"><Input value={r.outlets} onChange={(e) => set("outlets", e.target.value)} /></Field>
            <Field label="Climate control"><Input value={r.climateControl} onChange={(e) => set("climateControl", e.target.value)} /></Field>
            <Field label="Blackout curtains">
              <label className="flex items-center gap-2 h-10"><Checkbox checked={r.blackoutCurtains} onCheckedChange={(v) => set("blackoutCurtains", !!v)} /><span className="text-sm">Yes</span></label>
            </Field>
          </Section>

          <Section title="Money & Rules">
            <Field label="Resort fee"><Input value={r.resortFee} onChange={(e) => set("resortFee", e.target.value)} /></Field>
            <Field label="Incidental deposit"><Input value={r.incidentalDeposit} onChange={(e) => set("incidentalDeposit", e.target.value)} /></Field>
            <Field label="Minibar policy"><Input value={r.minibarPolicy} onChange={(e) => set("minibarPolicy", e.target.value)} /></Field>
            <Field label="Early/late check-in fee"><Input value={r.earlyLateFee} onChange={(e) => set("earlyLateFee", e.target.value)} /></Field>
            <Field label="Pet policy" full><Input value={r.petPolicy} onChange={(e) => set("petPolicy", e.target.value)} /></Field>
          </Section>

          <Section title="Noise & Location">
            <Field label="Floor / wing"><Input value={r.floorWing} onChange={(e) => set("floorWing", e.target.value)} /></Field>
            <Field label="Nearby noise"><Input value={r.nearbyNoise} onChange={(e) => set("nearbyNoise", e.target.value)} /></Field>
            <Field label="Quiet hours" full><Input value={r.quietHours} onChange={(e) => set("quietHours", e.target.value)} /></Field>
          </Section>

          <Section title="Accessibility">
            <Field label="Roll-in shower"><Input value={r.rollInShower} onChange={(e) => set("rollInShower", e.target.value)} /></Field>
            <Field label="Grab bars"><Input value={r.grabBars} onChange={(e) => set("grabBars", e.target.value)} /></Field>
            <Field label="Service animal area" full><Input value={r.serviceAnimalArea} onChange={(e) => set("serviceAnimalArea", e.target.value)} /></Field>
          </Section>

          <Section title="Inclusions">
            {([["breakfastIncluded", "Breakfast"], ["poolTowels", "Pool towels"], ["gymAccess", "Gym access"]] as const).map(([k, label]) => (
              <Field key={k} label={label}>
                <label className="flex items-center gap-2 h-10"><Checkbox checked={r[k] as boolean} onCheckedChange={(v) => set(k, !!v as never)} /><span className="text-sm">Included</span></label>
              </Field>
            ))}
          </Section>

          <Section title="Room amenities">
            <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROOM_AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 border border-border bg-card p-2 cursor-pointer hover:border-accent">
                  <Checkbox checked={r.amenities.includes(a)} onCheckedChange={() => toggle(a)} />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Images">
            <div className="col-span-2 space-y-2">
              <ImageHelpPanel spec={IMAGE_SPECS.room} />
              <Input type="file" accept={ACCEPTED_MIME} multiple onChange={(e) => addImages(e.target.files)} />
              <UploadProgressList items={uploads} onClear={() => setUploads([])} />
              {r.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {r.images.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden bg-muted">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => set("images", r.images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-background/90 p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(r)} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-[0.2em] text-xs px-6">Save Room</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="eyebrow">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
