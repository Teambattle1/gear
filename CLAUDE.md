# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev         # Vite dev server on http://localhost:5173 (auto-opens browser)
npm run build       # tsc -b && vite build → /dist
npm run typecheck   # tsc --noEmit (no separate lint/test setup exists)
npm run preview     # serve the built /dist locally
```

There is no test runner, no ESLint config, and no formatter wired up. `npm run build` is the only thing that enforces TypeScript strictness (via `tsc -b`); use `npm run typecheck` during development.

Environment: copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_ANON_KEY`. `src/lib/supabase.ts` ships with hard-coded fallback URL + anon key for the shared MAIN Supabase project (`ilbjytyukicbssqftmma`), so the app boots without a `.env.local`.

Deploy target is Netlify (`netlify.toml`): SPA fallback rewrites all routes to `/index.html`, so client-side routing works on prod.

## Architecture

This is a standalone React/Vite SPA spun out of FLOW (Taskmaster) so gear administration is decoupled from event management. UI text is Danish.

**Backend.** Single Supabase project shared with sibling apps (FLOW, CHECK, MY). All DB access goes through `src/lib/gearApi.ts` (gear, geartypes, gear_boxes, gear_set_assignments, gear_issues, gear_categories, gear_service_notes, activities, employees) and `src/lib/tabletsApi.ts` (tablets). Most tables predate this repo and live on MAIN; the migration `gear_categories_and_service_notes` (categories + `gear.category_id` + `gear_service_notes`) was applied via Supabase MCP, not as a file here. The `gearApi` helpers wrap most reads in a `safe()` helper that swallows errors and returns a fallback (`[]`) so the UI degrades instead of crashing; writes throw and expect callers to handle errors with `sonner` toasts.

**Routing.** `src/App.tsx` defines five routes (plus a `*` fallback to Landing):
- `/` → `pages/Landing.tsx` (activity grid + entry points)
- `/aktivitet/:slug` → `pages/ActivityGear.tsx` (gear list + sets + tablets for one activity)
- `/vedligeholdelse` → `pages/Maintenance.tsx` (out-of-service + repair)
- `/find` → `pages/FindEquipment.tsx` (GPS lookup via IMEI → LiveGPS)
- `/teambox` → `pages/TeamBox.tsx` (TeamBox instructor hub — see below)

The intro animation in `components/Intro.tsx` runs once per session, gated by `sessionStorage["gear_intro_seen"]`.

**Activity-specific UI on `ActivityGear`.** Hard-coded activity IDs branch the page:
- `activityId === "A1" || "A2"` shows `<TeamLazerSets>` (9-box sets w/ role assignments via `gear_set_assignments`).
- `activityId === "A1" || "A11"` shows `<TabletsList>`.
- Slug containing `box` adds a "Nulstil" pakkeliste link; slug containing `race` adds a "Sæbekasse-taske" link (see `lib/packingLinks.ts`).

Activity slug resolution is twofold: `listActivities()` slugifies `activity.id` (or falls back to slugified name), and `ActivityGear` matches the URL `:slug` against either `activity.slug` or `activity.id`. When introducing new activity-specific behaviour, branch on the stable `activityId`, not the slug.

**Gear categories, drag & service notes (`ActivityGear`).** Each activity can have named sections (`gear_categories`, keyed by `activity_slug`); a gear's `category_id` (nullable FK, `on delete set null`) decides its section, and gear with no category falls into an "Ukategoriseret" group. `GearList` renders the sectioned drag UI **only when `categories.length > 0`** — otherwise it falls back to the legacy flat grid, so activities without categories look unchanged. Drag-and-drop uses `@dnd-kit/core` (`PointerSensor` + `TouchSensor` with activation constraints so a tap still opens the detail modal while a drag/long-press moves the card; `collisionDetection={pointerWithin}`); dropping calls `setGearCategory`. Each activity also has one editable service note (`gear_service_notes`, PK `activity_slug`) shown via `ServiceNote.tsx` at the top of the page. Note: these tables key on the **URL slug** passed to the page (e.g. `A8`), which must match the `activity_slug` stored on `gear` for that activity.

**Cross-app integrations.**
- CHECK pakkelister: `buildPackingLinks()` in `lib/packingLinks.ts` constructs `https://check.eventday.dk/pakkeliste/{activityName-lower}/{type}` URLs. The slug used here is the lower-cased activity *name*, not the URL slug.
- LiveGPS: `FindEquipment` copies the IMEI to clipboard and opens `https://app.livegps.dk` in a new tab.
- FLOW continues to read the same gear tables for its Logistik step — keep the schema compatible.

**TeamBox hub (`/teambox`).** A self-contained instructor hub for the portable "Break-In" escape-room product, ported from the vanilla-HTML `GAMES/teambox.html`. Unlike the rest of the app it does *not* use react-router for its sub-screens — `TeamBox.tsx` keeps a single `view` state and swaps between an internal tile grid (`hub`) and sub-views (`guide`, `checklist`, `report`, `video`, `downloads`, `troubleshoot`); components live in `src/components/teambox/`.
- **Content is single-sourced** in `src/lib/teamboxContent.ts` (reset checklist, video IDs, instructor guide). The same data is duplicated by hand in `GAMES/teambox.html` — edit BOTH when changing copy, or the two surfaces drift.
- **Data paths bypass the `lib` API layer.** `TeamBoxReport` inserts straight into the `fejlsogning_reports` table via `supabase`; `TeamBoxDownloads` reads/writes the `teambox-files` Storage bucket directly with public URLs (no bucket-priority fallback like `uploadGearImage`). Neither is wrapped by `gearApi`/`tabletsApi`.
- Tiles deep-link out: "GEAR OVERSIGT" routes to `/aktivitet/A4` (TeamBox's gear lives under activity **A4**), "PAKKELISTER" opens the CHECK pakkeliste, and `kind: "soon"` tiles are disabled placeholders.

**Image uploads.** `uploadGearImage()` tries a list of Supabase Storage buckets in priority order (`assets`, `images`, `public`, `media`, `vehicle-docs`, `course-assets`) and uses the first one that exists. If you add a new bucket, prepend it; do not assume any single bucket is available.

**Styling.** Tailwind v3 with a `teamb` colour palette (`teamb-orange #ff6600` is the brand accent) plus a substantial set of bespoke component classes in `src/styles/index.css` (`.glow-tile`, `.panel`, `.primary-btn`, `.ghost-btn`, `.back-btn`, `.input`, `.input-label`, `.chip`, `.tile-label`, `.page-title`, intro animations). Prefer these classes over re-rolling new Tailwind combos when extending existing screens. A second `battle-*` palette (`battle-orange`, `battle-black`, `battle-grey`, …) mirrors the CCC/GAMES vanilla-HTML tokens and is used **only** by the TeamBox screens so their markup stays compatible with `GAMES/teambox.html` — use `teamb-*` everywhere else. Custom breakpoints `tablet`/`tablet-landscape` (1024px) and `desktop` (1280px) drive the `tablet:` prefix seen throughout; screens are built tablet-first for on-site crew.

**Path alias.** `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`). Imports use `@/lib/...`, `@/components/...`, `@/pages/...`.

## URL-tilstand: nuqs som standard

Brug **nuqs** som standardvalg til al "URL-værdig" tilstand i alle projekter
(React + Vite / React Router). Wrap app'en i den rette NuqsAdapter.

✅ BRUG nuqs til: filtre, faner, søgeord, paginering, valgt element, wizard-trin
   → så links kan deles/bogmærkes, tilbage-knappen virker, og reload bevarer tilstanden.

❌ BRUG IKKE nuqs til:
   - Flygtig UI-tilstand (åben menu, hover, uafsendt formular) → lokal state (useState).
   - Server-data (Supabase) → dataLaget/React Query, ikke URL.
   - Følsomme data → ALDRIG i URL'en (logges/deles = privacy-fælde).
   - Realtids/tunge data (fx GPS-spillets live-position, svar, billeder, videoklip)
     → gentagne URL-opdateringer giver performance-problemer. Hold det ude af URL'en.

Tommelfinger: skal tilstanden kunne deles via et link og overleve en reload?
→ nuqs. Ellers ikke.

## Datahentning fra Supabase

Hent ALTID data gennem et data-lag (TanStack/React Query) — aldrig løse fetch-kald
spredt i komponenterne. Det giver caching, automatisk genhentning og ét sted at rette.

✅ ALTID:
   - Vis tydelig loading- OG fejl-tilstand. Intet må "hænge" uden feedback til brugeren.
   - Hent kun de kolonner/rækker der bruges (undgå SELECT *), og undgå N+1 (hent i ét kald).
   - Stol på RLS som sikkerhedslag — filtrér ikke kun i frontend.
   - Brug realtime/subscriptions sparsomt — kun hvor live-opdatering giver reel værdi.

❌ ALDRIG:
   - Læg forretningslogik/adgangskontrol i frontend alene.
   - Hent hele tabeller for at filtrere i browseren.

Tommelfinger: én kilde til data (query-laget), tydelige tilstande, mindst mulig data hentet.

## Communication rules (IMPORTANT)

- **Never paste raw bot or webhook content into chat.** This applies to
  deploy bots (Netlify, Vercel, etc.), GitHub event payloads, CI logs, and
  API responses: do not echo raw JSON, escaped HTML, hidden HTML comments,
  or markdown tables verbatim.
- Summarize such content in one or two plain sentences with at most the one
  or two relevant links, e.g. "Netlify deploy preview is ready: <URL>".
- Keep chat replies short and human-readable; the user often reads them on a
  phone.
- Do not subscribe to pull-request activity (`subscribe_pr_activity`) unless
  the user explicitly asks for PR monitoring: the raw GitHub/Netlify event
  notifications are rendered verbatim in the chat, which is exactly the
  noise these rules exist to prevent. To follow up on a PR, use a quiet
  scheduled check-in (e.g. `send_later`) instead.

## Task tracking (IMPORTANT)

- At the start of every session, create a todo list from the user's requests
  (use the task/todo tools): one item per thing the user asks for.
- Update the list as work proceeds — mark items in progress when started and
  completed as each fix lands — so the user can always see current status.
- When the user adds new requests mid-session, add them to the list
  immediately; never leave the list stale.
