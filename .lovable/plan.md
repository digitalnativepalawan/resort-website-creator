# Plan

## Part 1 — Hide the "Tweaks" button for public visitors

**Current behavior** (`src/pages/Index.tsx`):
- When `isAdmin === false`, a floating Tweaks pill is rendered at the top-right of every visitor's screen.
- When `isAdmin === true`, Tweaks is shown inline inside the Admin bar.

**Desired behavior:**
- Public visitors (published site, no admin) → no Tweaks button at all.
- Admin only → Tweaks remains inline in the Admin bar (unchanged).
- The hidden "click to open Admin Gate" entry point must remain reachable so the owner can still log in. Today that's wired through `onAdminClick` on `ResortSite` (e.g., footer/logo tap), so removing the floating Tweaks pill does not lock anyone out.

### Change
In `src/pages/Index.tsx`:
- Remove the `{!isAdmin && (<div className="fixed top-3 right-3 z-40">{tweaks}</div>)}` block.
- Keep the `tweaksSlot={tweaks}` inside `<AdminBar />` so admins still see it.
- Leave `OnboardingWizard`, `AdminGate`, and `ResortSite` untouched.

That's the entire code change — one block removed. No types, no store, no migrations.

---

## Part 2 — Publishing with multiple sites / multiple owners (informational)

This is **how Lovable works today**, not a code change. Summary so you can plan your rollout:

### One Lovable project = one published site
Each Lovable project publishes to **one** URL at a time:
- A free `*.lovable.app` subdomain (e.g. `resort-create-webapp.lovable.app`), and/or
- One or more **custom domains** connected to that same project (you already have `palawan.merqato.digital` connected).

If you need a **second resort site**, you create a **second Lovable project** (Remix this one, or start fresh and copy). Each project gets its own publish URL and its own custom domain(s). They do **not** share a database — each project has its own Lovable Cloud backend, so resort A's edits never touch resort B.

### Multiple owners
Two models, pick per project:

1. **Workspace members** (recommended for an agency building many client sites)
   - Project Settings → People → invite collaborators by email.
   - Everyone in the workspace can edit the project in Lovable and publish it.
   - Billing/credits are shared at the workspace level.

2. **Project transfer** (recommended when you hand a finished site to a client)
   - Project Settings → Transfer → move the project to the client's Lovable account/workspace.
   - They become the owner, manage their own billing, and connect their own domain.
   - You lose edit access unless they re-invite you.

### Custom domain per site
- Each project supports its own custom domain via Project Settings → Domains.
- You can either **connect** a domain you already own (add A record `185.158.133.1` for `@` and `www`, plus the `_lovable` TXT verification record) or **buy a new domain** directly inside Lovable on a paid plan.
- A domain can only be active on one project at a time. To move it to a different site, remove it from the old project first, then connect it to the new one (you re-prove ownership).
- Lovable provisions SSL automatically once DNS verifies.

### Recommended setup for your case (multiple resorts, possibly multiple owners)
```text
Workspace (you)
├── Project: Palawan Resort   → palawan.merqato.digital
├── Project: Resort #2        → resort2.yourdomain.com
└── Project: Resort #3        → *.lovable.app (until they buy a domain)
```
- Build each new resort by **Remixing** this project so it inherits the editor/onboarding system, then run onboarding to fill in that resort's content.
- If a specific client should own their site, **Transfer** that single project to them after launch; the others stay in your workspace.
- Frontend changes require clicking **Publish → Update** to go live; backend changes (DB, edge functions) deploy automatically.

---

## Files touched
- `src/pages/Index.tsx` — remove the public-facing floating Tweaks pill.

No database, storage, or RLS changes. No risk to the data work already stabilized.
