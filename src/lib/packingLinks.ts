export type PackingLink = {
  label: string;
  sublabel: string;
  url: string;
};

const CHECK_BASE = "https://check.eventday.dk";

export function buildPackingLinks(activityName: string | undefined): PackingLink[] {
  if (!activityName) return [];
  const slug = activityName.toLowerCase();

  const links: PackingLink[] = [
    {
      label: "Pakkeliste før",
      sublabel: "Afgang fra lager",
      url: `${CHECK_BASE}/pakkeliste/${slug}/afgang`,
    },
    {
      label: "Pakkeliste efter",
      sublabel: "Hjemkomst til lager",
      url: `${CHECK_BASE}/pakkeliste/${slug}/hjemkomst`,
    },
  ];

  if (slug.includes("box")) {
    links.push({
      label: "Nulstil",
      sublabel: "Pak om efter brug",
      url: `${CHECK_BASE}/pakkeliste/${slug}/nulstil`,
    });
  }

  if (slug.includes("race")) {
    links.push({
      label: "Sæbekasse-taske",
      sublabel: "Pr. sæbekasse",
      url: `${CHECK_BASE}/pakkeliste/${slug}/taske`,
    });
  }

  return links;
}

export function buildLibraryLink(activityId: string): string {
  return `${CHECK_BASE}/admin/bibliotek/${activityId}`;
}
