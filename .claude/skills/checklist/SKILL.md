---
name: checklist
description: Hent en Checklist-pakke (Thomas' fund fra Checklist mode i GEAR) fra databasen, ret fundene sektion for sektion i én PR, og skriv status tilbage pr. fund. Brug den når brugeren skriver "/checklist <pakke>", "ret checklist-pakken", "ret dagens fund", "ret pakke 22/10-A" eller på anden måde beder om at få fundene fra Checklist mode rettet.
---

# /checklist — fra pakke til PR (GEAR)

Thomas har gået GEAR igennem med **Checklist mode** (forsiden → «Admin» (lås) nederst → kode → «Checklist mode»): et lag
over alle skærme, hvor han peger på det, der er galt, og indtaler/skriver hvad
der skal rettes. Hvert fund ligger i databasen med skærmbillede, skærm → fil,
det trykkede element, rute, enhed, version og de seneste konsolfejl. **Bed
ikke om skærmbilleder eller «hvor i appen» — det står i pakken.**

Funktionen kommer fra Checklist-kittet (`teambattle-workspace/checklist-kit`).
Alle apps med kittet deler tabellerne `cm_packages` + `cm_items` i Supabase
**MAIN** (`ilbjytyukicbssqftmma`), skilt ad af kolonnen `app` — her er det
**`app = 'gear'`**. Filtrér ALTID på den. (TeamTrack har sin egen udgave
på TRACK-db med tabellerne `checklist_*` — ikke disse.)

## Fase 1 — hent pakken (Supabase-MCP, virker fra enhver session)

Pakkens navn er «dd/mm · bogstav» i appen og `dd/mm-bogstav` i start-linjen
(`/checklist 22/10-A` ↔ titlen `22/10 · A`). Uden navn: den nyeste med status
`sent`, ellers den nyeste åbne.

```sql
select id, title, status, created_at, sent_at, device, app_version
from cm_packages
where app = 'gear' and title = '22/10 · A'   -- eller: order by created_at desc limit 1
order by created_at desc limit 1;

-- Fundene (ALT undtagen billederne — de hentes pr. fund nedenfor)
select id, seq, screen_key, screen_label, screen_state, screen_file, route, kind,
       comment, element, context, errors, status, fix_ref, fix_version
from cm_items
where package_id = '<pakke-id>' and status in ('open','sent','in_progress')
order by seq, created_at;
```

Sig straks til panelet, at du har taget pakken (så står den som «I gang» i
appen — pakkens status REGNES af fundene):

```sql
update cm_items set status = 'in_progress'
 where package_id = '<pakke-id>' and status in ('open','sent');
```

**BILLEDERNE SKAL SES.** Miniaturen (`thumb_b64`, 480 px JPEG data-URI) og det
store billede (`shot_b64`, ≤1280 px) ligger i rækken — hent ét fund ad gangen:

```sql
select thumb_b64 from cm_items where id = '<fund-id>';
```

Base64 fylder mange tokens: lad en HJÆLPER (`Agent`, general-purpose) hente
billederne, skrive dem med Write, `base64 -d` → `.jpg` (klip
`data:image/jpeg;base64,` af først), læse dem med Read og beskrive hver skærm
ordret (layout, knapper, teksten ved den røde ramme, farver). Den røde ramme
med nummeret = fundets `seq`.

## Fase 2 — TODO i chatten, med Thomas' egne ord

Én TODO-linje pr. fund i pakkens rækkefølge, kommentaren som titel
(`«Knappen er for lille på telefon» · fund 3 · Dashboard`). Sidste linjer er
altid commit og «push/ship (når du siger til)». Listen skal findes FØR du
retter noget.

## Fase 3 — fra fund til fil

Pr. sektion (= skærmnøgle):

1. `screen_file` er filen, du åbner først; `screen_state` er fx en åben dialog.
   Mangler filen, slå `screen_key` op i ``src/components/checklist/cmScreens.ts``.
2. `element.testid` → `grep -rn 'data-testid="<id>"'`; ellers `element.text`,
   `element.ariaLabel`, `element.classes` (Tailwind-klasserne er ofte selve
   fejlen), `element.heading` og `element.components` (React-komponentnavne,
   nærmeste først — fulde i dev, kun de overlevende i et minificeret byg).
3. `context` siger viewport, enhed, PWA, version og bruger. Et layout-fund på
   390×844 er et andet end på 1440×900 — mål på SAMME viewport.
4. `errors` er de seneste konsolfejl.
5. Læs CLAUDE.md FØR du rører koden.

Ret fundene i samme sektion sammen: ét commit pr. sektion.

## Fase 4 — det, der ikke skal rettes

Et fund, der ikke bør eller kan rettes (bevidst design, kræver Thomas'
beslutning, uden for repoet), bliver **afvist MED årsag** — aldrig sprunget
tavst over. Skriv det tilbage som `declined` (fase 6) OG stil et direkte
spørgsmål til Thomas (AskUserQuestion), én linje om hvorfor.

## Fase 5 — tests, commit, PR

`npm run build` (tsc -b + vite build) skal være grøn før commit. Husets git-regel i CLAUDE.md gælder
uændret (commit/push kun når Thomas udtrykkeligt siger det; Netlify deployer main). Én PR pr. pakke; titlen nævner pakken:
`Checklist 22/10-A: 7 fund rettet`.

## Fase 6 — skriv status tilbage (Supabase-MCP)

```sql
-- Rettet (fix_version = den version, rettelsen shipper som, når den kendes)
update cm_items set status = 'fixed', fix_ref = 'PR #123', fix_version = '1.9.0'
 where id in ('<fund-id>', '<fund-id>');

-- Afvist med årsag (én sætning, Thomas læser den i panelet)
update cm_items set status = 'declined', declined_reason = 'Bevidst: …'
 where id = '<fund-id>';
```

`in_progress` må ALDRIG stå tilbage, når du slutter: hvert fund ender som
`fixed` eller `declined` (eller tilbage til `sent`, hvis du stopper midt i —
sig det). Panelet viser derefter «Rettet · PR #123», «Ude i v1.9.0», når
appens version har nået den, og «Afvist: …». Når appen åbnes igen, ser Thomas
«n fund håndteret af Claude siden sidst».

## Fase 7 — slut

Den almindelige ikke-tekniske opsummering: hvad er rettet pr. skærm, hvad er
afvist og hvorfor, og hvad Thomas skal gøre (fx sige «push»).
