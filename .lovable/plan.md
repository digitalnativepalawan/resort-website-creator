## Goal

Four changes to turn this template into a cleaner agency starting point:

1. Rename mock data to **BAIA Palawan Island Resort**.
2. Move the admin passkey **out of code** into the database (per-resort).
3. Add a **duplicate-safety check** so freshly remixed projects start blank with the wizard open.
4. Add **per-resort SEO** (dynamic title, description, OG image, JSON-LD).

---

## 1. Rebrand mock data

In `src/lib/resort-types.ts` `DEFAULT_RESORT`, change only:
- `name` → `"BAIA Palawan Island Resort"`
- `location` → `"Palawan, Philippines"`
- `tagline` → `"A barefoot island sanctuary on Palawan"`
- `description` → new short paragraph about a Palawan island resort (cliffs, turquoise water, private cove). Keep length similar to current.
- `contact.address` (line 191) → `"Palawan, Philippines"`
- Wizard placeholders in `OnboardingWizard.tsx` lines 303/307 → `"BAIA Palawan Island Resort"` / `"Palawan, Philippines"`

Everything else (amenities, images, pricing, rooms, etc.) untouched.

---

## 2. Move admin passkey out of code

**Storage:** add an `admin_passkey` column on `resort_settings` (text, default `"5309"` so existing projects keep working). Stored in the same singleton row as resort + theme. Public RLS already allows read/update of the singleton row — fine for this use case (the passkey is a soft gate, not a security boundary; the real protection is Lovable account access to the project).

**Wizard:** add a "Security" step (or a small field on the final step) where admin can set/change the passkey. Default shown is current value.

**AdminGate:** read passkey from `useResortStore()` instead of the hardcoded `ADMIN_PASSKEY` constant. Remove the constant.

**Migration:**
```sql
ALTER TABLE public.resort_settings
  ADD COLUMN admin_passkey text NOT NULL DEFAULT '5309';
```

Store also surfaces `adminPasskey` / `setAdminPasskey` and includes it in the cloud save payload.

---

## 3. Duplicate-safety on remix

**Problem:** when this project is remixed, the new project gets a fresh empty Lovable Cloud DB but the remixer's browser may still have `localStorage` from the original (`resort.onboarded.v1 = "1"`, cached `resort.data.v1`), so the wizard doesn't open and they see stale data flicker.

**Fix:** detect "fresh project, no cloud row yet" and reset local state.

In `useResortStore`, after the initial cloud load:
- If the `resort_settings` row does **not** exist (the `.maybeSingle()` returns `data === null`), treat this as a brand-new project:
  - Clear `resort.data.v1`, `resort.theme.v1`, `resort.onboarded.v1`, `resort.admin.v1` from localStorage.
  - `setResort(EMPTY_RESORT)`, `setOnboarded(false)`.
  - This causes `Index.tsx` to open the wizard automatically (already does when `!onboarded`).
- Also insert a placeholder singleton row immediately so subsequent visitors don't re-trigger the reset.

No change needed to `Index.tsx` — wizard already opens when `!onboarded`.

---

## 4. Per-resort SEO

Create `src/components/ResortSEO.tsx` that uses `useEffect` to update the document head from `resort` data (no extra dep needed — direct DOM updates):

- `<title>` → `${resort.name} — ${resort.tagline}` (truncated to 60 chars)
- `<meta name="description">` → `resort.description` truncated to 155 chars
- `<meta property="og:title">`, `og:description`, `og:image` (first image), `og:type=website`
- `<meta name="twitter:card">` = `summary_large_image`, twitter:title/description/image
- `<link rel="canonical">` → `window.location.origin + window.location.pathname`
- JSON-LD `<script type="application/ld+json">` with `LodgingBusiness` schema:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": ..., "description": ..., "image": [...],
    "address": { "@type": "PostalAddress", "addressLocality": resort.location },
    "telephone": resort.contact.phone,
    "email": resort.contact.email,
    "url": window.location.origin,
    "priceRange": ...
  }
  ```

Mount `<ResortSEO resort={resort} />` once inside `Index.tsx`. Updates reactively whenever resort data changes.

Also update `index.html` defaults (title/description) to a generic "Resort site — built on Lovable" fallback so the pre-hydration HTML isn't `merqato.digital`.

---

## Files touched

- `src/lib/resort-types.ts` — rebrand defaults
- `src/components/OnboardingWizard.tsx` — placeholders + passkey field
- `src/components/AdminGate.tsx` — read passkey from store
- `src/hooks/useResortStore.ts` — passkey state + duplicate-safety reset
- `src/components/ResortSEO.tsx` — new
- `src/pages/Index.tsx` — mount `ResortSEO`
- `index.html` — generic defaults
- DB migration: add `admin_passkey` column

No edge functions. No auth changes.
