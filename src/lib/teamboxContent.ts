// ============================================================================
// TeamBox — fælles indhold (rum-tjekliste, videoer, guide)
// ----------------------------------------------------------------------------
// Dette er ENESTE kilde til sandhed for TeamBox-tekstindhold i GEAR.
// Den tilsvarende GAMES-version (GAMES/teambox.html) holder de SAMME data,
// så de to versioner er ens. Ret begge steder hvis indholdet ændres.
// ============================================================================

export interface ChecklistItem {
  id: string;
  text: string;
  subtext?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  subtitle: string;
  items: ChecklistItem[];
}

// ---- Rum-tjekliste (nulstilling) -------------------------------------------
export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "box",
    title: "ESCAPEBOX",
    subtitle: "HOVED BOKS",
    items: [
      { id: "b1", text: "BRIEF", subtext: "TJEK DER IKKE ER SKREVET PÅ DET" },
      { id: "b2", text: "BLOK", subtext: "TJEK DER IKKE ER SKREVET PÅ SIDERNE" },
      { id: "b3", text: "KUGLEPEN" },
      { id: "b4", text: "RØD KUVERT", subtext: "TJEK DEN ER TOM FØR START" },
      { id: "b5", text: "KODELÅS 3593", subtext: "TJEK DEN ER NULSTILLET" },
      { id: "b6", text: "KODELÅS 4 CIFRE - 1375", subtext: "TJEK DEN ER NULSTILLET" },
    ],
  },
  {
    id: "rum1",
    title: "RUM 1",
    subtitle: "FØRSTE RUM",
    items: [
      { id: "r1-1", text: "KORTMÅLER", subtext: "TJEK DEN ER NULSTILLET" },
      { id: "r1-2", text: "VANDFLASKE (KODE 130)", subtext: "TJEK DEN ÅBNER + DER ER VAND I" },
      { id: "r1-3", text: 'SÆT KODEN TIL "RANDOM"' },
      { id: "r1-4", text: "PENSEL" },
      { id: "r1-5", text: 'PAPIR MED "MISSIL ETC."', subtext: "TJEK DER IKKE ER SKREVET PÅ" },
      { id: "r1-6", text: "KODEHJUL", subtext: "DREJ DET TIL TILFÆLDIG POSITION" },
      { id: "r1-7", text: 'KUVERT MED "FRIMÆRKE"', subtext: "TJEK DEN ER TOM VED START" },
      { id: "r1-8", text: "PAPIRSFLYVER" },
      { id: "r1-9", text: "LEDERE MED FLAG" },
      { id: "r1-10", text: "TANK" },
      { id: "r1-11", text: "SÆNKE SLAGSKIB" },
      { id: "r1-12", text: "FILMSTRIMMEL" },
    ],
  },
  {
    id: "rum2",
    title: "RUM 2",
    subtitle: "ANDET RUM",
    items: [
      { id: "r2-1", text: 'KODE "RETNING"', subtext: "NED/VENSTRE/OP" },
      { id: "r2-2", text: "HVIDE LÅSE", subtext: 'PRES 2 GANGE PÅ "BØJLE" FOR NULSTILLING' },
      { id: "r2-3", text: "BOGSTAVER MED HULLER", subtext: "TJEK DER IKKE ER SKREVET PÅ" },
      { id: "r2-4", text: "GOOGLE TRANSLATE", subtext: "TJEK DER IKKE ER SKREVET PÅ" },
      { id: "r2-5", text: "PUZZLE", subtext: "FIND EVT. MANGLENDE BRIKKER" },
    ],
  },
  {
    id: "rum3",
    title: "RUM 3",
    subtitle: "TREDJE RUM",
    items: [
      { id: "r3-1", text: "HØJTALER", subtext: "SÆT FREKVENS TIL CA. 92.0" },
      { id: "r3-2", text: "TJEK HØJTALER MORSER" },
      { id: "r3-3", text: "DREJ FREKVENS HELT TIL VENSTRE IGEN" },
      { id: "r3-4", text: "FJERN BATTERIER/SLUK POWERBANK", subtext: "SKAL DEN LADES?" },
      { id: "r3-5", text: "KORT MED MORSE", subtext: "TJEK DER IKKE ER SKREVET PÅ" },
      { id: "r3-6", text: "KÆDEN", subtext: "TJEK LÅST I NEDERSTE + YDERSTE LED" },
      { id: "r3-7", text: "HÆNGELÅS KODE 555" },
    ],
  },
  {
    id: "rum4",
    title: "RUM 4",
    subtitle: "FJERDE RUM",
    items: [
      { id: "r4-1", text: "PENGE", subtext: "9 SEDLER (8 ER OK): 5,10,50,100,200,500,1000,2000,5000" },
      { id: "r4-2", text: "LABYRINT", subtext: "TJEK DER IKKE ER SKREVET PÅ PAPIR" },
      { id: "r4-3", text: "OVERHEAD", subtext: "TJEK DER IKKE ER SKREVET PÅ + PLACER PRINT BAG" },
      { id: "r4-4", text: "TJEK AT LÅG ER LÅST FORAN I HULLET" },
      { id: "r4-5", text: "MORSELÅS – KODE MORSE", subtext: '"RANDOM" VED LÅSNING' },
      { id: "r4-6", text: "HJULLÅS – LÅS DENNE" },
      { id: "r4-7", text: "HVID KUVERT" },
    ],
  },
];

// ---- Video guides ----------------------------------------------------------
export interface VideoItem {
  id: string;
  title: string;
  isShort?: boolean;
}

export const TEAMBOX_VIDEOS: VideoItem[] = [
  { id: "sGPOQ7K4W_c", title: "BOXEN", isShort: true },
  { id: "Nb8_vcPYr6E", title: "RUM 1", isShort: true },
  { id: "k8-QiejNScw", title: "RUM 2", isShort: true },
  { id: "S4kALbvzaKg", title: "RUM 3", isShort: true },
  { id: "IeTOgTILQ1s", title: "Gennemgang DK", isShort: false },
  { id: "NR0Fpfe_ehg", title: "Gennemgang UK", isShort: false },
];

// ---- Instruktør-guide (statisk indhold) ------------------------------------
export type GuideColor = "red" | "green" | "blue" | "yellow" | "purple" | "orange";

export interface GuideSection {
  key: string;
  title: string;
  content: string;
  icon: string; // lucide-ikonnavn (mappes i komponenten)
  color: GuideColor;
  link?: string;
  linkText?: string;
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    key: "maalsaetning",
    title: "MÅLSÆTNING & TEAMS",
    icon: "Target",
    color: "red",
    content: `TeamBox er en mobil "Escaperoom Experience", bare som en "BREAK-IN" version, så vi kan have op til 18 hold samtidig til at "bryde" ind i samme "escaperoom".

Det handler om at løse ca 20 mindre opgaver i den rigtige rækkefølge, for at stoppe tiden inden der er gået 60 minutter.

TEAMOPDELING: 3-4 deltagere pr. team`,
  },
  {
    key: "tidsplan",
    title: "TIDSPLAN",
    icon: "Clock",
    color: "blue",
    content: `FØR OPGAVEN:
• 15 min - Forberedelse, gense video, tjekliste afgang
• 15 min - Ankomst location, opsætning af boxe (2 min pr box)

AFVIKLING:
• 05 min - Velkomst og TEAMS
• 60 min - Afvikling
• 02 min - Kåring af vinder og afslutning

EFTER:
• 20 min - Oprydning og korrekt nedpakning
• 15-30 min - Nulstilling af boxe (ca. 3-4 min pr. box)
• 05 min - Tjekliste HJEMKOMST (Lager)`,
  },
  {
    key: "musik",
    title: "MUSIK TIL OPGAVEN",
    icon: "Music",
    color: "green",
    content: `Connect JBL 5 musikafspiller med bluetooth – en tablet på WIFI eller din egen telefon.

BRUG denne playliste "MUSIK 1" generelt.

REGLER:
• Musik skal spille når gæsterne kommer - tilpas højt til et godt "lydtæppe"
• Sluk under velkomst og alle fællesinstruktioner
• Start igen når de går i gang med boxene
• Afspil også musik når der pakkes sammen til de sidste er gået

Er I flere instruktører, skal én tage ansvaret for musikken.
Har du smartwatch, kan Spotify justeres derfra.`,
  },
  {
    key: "foer_opgaven",
    title: "FØR OPGAVEN",
    icon: "ClipboardList",
    color: "yellow",
    link: "https://check.eventday.dk/pakkeliste/teambox/afgang",
    linkText: "PAKKELISTE AFGANG",
    content: `Tjek at du har alt nedenstående med før du kører fra lageret...

PAKKELISTE:
• X grønne bokse (1 til hvert hold - tjek i app)
• 1-2 ekstrabokse – just in case
• Sorte filtmåtter til skrøbelige borde (1 til hver boks)
• 1 x powerbank til hver boks + extra
• 1 stk JBL musikafspiller
• 1 stk sækkevogn – hvis du skal slæbe dem

INSTRUKTØRKASSE:
• Lamineret holdnumre (Tal fra hold 1-18)
• Ekstramaterialer`,
  },
  {
    key: "ankomst",
    title: "ANKOMST & OPSÆTNING",
    icon: "MapPin",
    color: "purple",
    content: `1. Find konferencecrew eller kontaktperson
2. Se i APP hvad der er aftalt - fortæl dette til konferencecrew
3. Er pladsen for lille? Find løsning FØR kunden kommer
4. SMS til kunden når du er ankommet

OPSÆTNING:
• Placer boksene med afstand - så hold ikke kan høre hinanden
• Sæt stole så alle på holdet kan se ind i boksen
• Placer så teams IKKE kan se hvad der sker i andres boxe
• Placer RØD kuvert + blok + kuglepen ovenpå boxen
• Lås med lille lås: 1-3-7-5 og SIKRER den er låst
• Tænd musikken svagt som det første`,
  },
  {
    key: "velkomst",
    title: "VELKOMST & INTRO",
    icon: "Users",
    color: "orange",
    content: `Fordel teams rundt ved bordene (max 4, gerne 3 pr. hold).

Byd velkommen og fortæl:
• Hvem du er
• At du glæder dig

INTRO:
• De har 60 minutter til at bryde ind i boxen
• Komme igennem rummene og TRYKKE på den røde knap
• ALT hvad de skal bruge er VED og PÅ boksen (IKKE i rummet eller UNDER boxen)
• Boxen må IKKE vendes om!
• Når du siger klar, må de åbne den røde kuvert ovenpå boxen`,
  },
  {
    key: "afvikling",
    title: "AFVIKLING & HINTS",
    icon: "HelpCircle",
    color: "blue",
    link: "https://l.ead.me/teambox-videoguide",
    linkText: "SE VIDEO GUIDE",
    content: `Dit job er at sikre alle teams kommer igennem de enkelte rum - med/uden din hjælp.

Når de spørger om "løsninger" - giv HINTS, men IKKE svar!

TIDSFORVENTNINGER:
• Zone 1 - IND I BOX: 5-6 min
• Zone 2 - RUM 1: 15 min (ca. 55 min tilbage)
• Zone 3 - RUM 2: 15 min (ca. 40 min tilbage)
• Zone 4 - RUM 3: 10-12 min (ca. 25 min tilbage)
• Zone 5 - RUM 4: 10-12 min (ca. 10 min tilbage)

Hjælp med hints hvis de trækker over disse tider.
I Zone 5 hjælper du IKKE mere - heller ikke med nulstilling af låsen til den røde knap.`,
  },
  {
    key: "afslutning",
    title: "AFSLUTNING & KÅRING",
    icon: "Trophy",
    color: "yellow",
    content: `Når alle er færdige:

1. Fortæl tiderne for TOP 3 teams
2. Kår vinderteamet højtideligt
3. Tak af og sig "håber I har haft en sjov Break-In oplevelse med os fra TeamBattle"

God stemning og anerkendelse til ALLE hold!`,
  },
  {
    key: "oprydning",
    title: "OPRYDNING & HJEMKOMST",
    icon: "Home",
    color: "green",
    content: `Gearet skal virke og være klar til næste bruger!

EFTER HVER OPGAVE:
• Alle batterier skal oplades
• Alle boxe skal nulstilles jf. nulstillingsskema
• Skriv fejl/mangler i evalueringen
• Ring STRAKS hvis gear ikke virker til næste opgave

Se nulstillingsskema: https://l.ead.me/teambox-nulstil`,
  },
];

// ---- Fejl & mangler — gear-valgmuligheder ----------------------------------
export const FEJL_GEAR_OPTIONS = ["EscapeBOX", "Låse", "Props", "Hints", "Andet"];

// Supabase storage bucket til TeamBox-filer (downloads)
export const TEAMBOX_BUCKET = "teambox-files";
