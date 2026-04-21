# GEAR by TEAMBATTLE

Standalone udstyrsdatabase for TEAMBATTLE-aktiviteter. Flyttet ud af FLOW (Taskmaster) til eget site så gear-administration ikke er koblet til event-management-appen.

**Live:** https://gear.eventday.dk

## Stack

- React 18 + TypeScript + Vite 6
- Tailwind CSS v3
- Supabase (MAIN instans `ilbjytyukicbssqftmma` — delt med FLOW, CHECK, MY m.fl.)
- React Router v6
- lucide-react + sonner

## Kom i gang

```bash
npm install
cp .env.example .env.local   # udfyld VITE_SUPABASE_ANON_KEY
npm run dev                  # åbner http://localhost:5173
npm run build                # produktions-build til /dist
```

## Struktur

```
src/
  pages/
    Landing.tsx          Aktivitets-grid (GAMES-stil)
    ActivityGear.tsx     Gear for én aktivitet + CHECK pakkeliste-links
    Maintenance.tsx      Ude-af-drift + reparation
    FindEquipment.tsx    GPS-sporing via LiveGPS
  components/
    Intro.tsx            Intro-animation (GAMES-stil, vises 1 gang pr. session)
    GearList.tsx         Grid af gear med detalje-modal
    GearForm.tsx         Opret-formular
    GearEditForm.tsx     Rediger-formular
    GearCreationModal.tsx
    GearBoxesGrid.tsx    9-boks-grid for TeamLazer-sæt
    OutOfServiceOverview.tsx
    TeamLazerSets.tsx
  lib/
    supabase.ts          Client-singleton
    gearApi.ts           Alle CRUD-operationer mod gear-tabeller
    activities.ts        Fallback activity-liste hvis DB er tom
```

## Database

Bruger de eksisterende gear-tabeller på MAIN Supabase:

- `gear` — enheder (activity_slug, geartype_id, location, EMEI, batteri m.m.)
- `geartypes` — typer (fx Display, Gevær, Kaster)
- `gear_boxes` — bokse tilknyttet et sæt-gear
- `gear_set_assignments` — role-mapping for TeamLazer-sæt
- `gear_issues` + `gear_issue_attachments` — fejlrapporter
- `activities` — aktivitets-katalog (læses for at bygge landing-grid)

Ingen DB-migrationer er nødvendige — tabellerne er allerede oprettet af FLOW.

## Integration

**→ CHECK pakkelister:** Hver aktivitets-side har knapper der åbner `check.eventday.dk/pakkeliste/{slug}/{type}` for relevante list-types (afgang, hjemkomst, nulstil for TeamBox, taske for TeamRace).

**← FLOW:** TaskmasterWizard i FLOW læser fortsat samme gear-tabeller til Logistik-step. Gear-administrationen (oprettelse, redigering, vedligeholdelse) flyttes hertil.
