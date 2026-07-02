import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Radio,
  Monitor,
  Crosshair,
  Gauge,
} from "lucide-react";
import { resolveColorCode } from "@/lib/activityIcons";
import type { Gear } from "@/lib/gearApi";

// Faithful, skrivebeskyttet kopi af CREW's TeamLazer frekvens-oversigt
// (crew.eventday.dk → TeamLazerGearList). Læser samme delte `gear`-tabel,
// så instruktører ser nøjagtig samme overblik her på gear.eventday.dk.
// Redigering sker stadig via det eksisterende "Rediger gear"-form og sæt-panelet.

type SortKey =
  | "name"
  | "type"
  | "status"
  | "location"
  | "color_code"
  | "frequency"
  | "serial_numbers"
  | "emei_number"
  | "maintenance_date";
type SortDir = "asc" | "desc";

type UnitFilter = "all" | "displays" | "kasters" | "gevaer";

const COLOR_DOT_FALLBACK = "#6b7280";

function typeOf(g: Gear): string {
  return (g.geartype?.name || "").toLowerCase();
}

function formatDate(d: string | null | undefined): string {
  if (!d || d === "0001-01-01") return "–";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "–";
  return dt.toLocaleDateString("da-DK");
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 border border-white/20 align-middle shrink-0"
      style={{ backgroundColor: resolveColorCode(color) || COLOR_DOT_FALLBACK }}
    />
  );
}

export default function TeamLazerFrequencyOverview({ items }: { items: Gear[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("frequency");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState<UnitFilter>("all");

  const counts = useMemo(() => {
    let displays = 0;
    let kasters = 0;
    let gevaer = 0;
    for (const g of items) {
      const t = typeOf(g);
      if (t.includes("display")) displays++;
      else if (t.includes("kaster")) kasters++;
      else if (t.includes("gevær") || t.includes("gevaer")) gevaer++;
    }
    return { displays, kasters, gevaer };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((g) => {
      const t = typeOf(g);
      if (filter === "displays") return t.includes("display");
      if (filter === "kasters") return t.includes("kaster");
      return t.includes("gevær") || t.includes("gevaer");
    });
  }, [items, filter]);

  const sorted = useMemo(() => {
    const valueFor = (g: Gear): string | number => {
      switch (sortKey) {
        case "name":
          return g.name.toLowerCase();
        case "type":
          return typeOf(g);
        case "status":
          return g.out_of_service ? 1 : 0;
        case "location":
          return (g.location || "").toLowerCase();
        case "color_code":
          return (g.color_code || "").toLowerCase();
        case "frequency":
          return (g.frequency || "").toLowerCase();
        case "serial_numbers":
          return (g.serial_numbers || "").toLowerCase();
        case "emei_number":
          return (g.emei_number || "").toLowerCase();
        case "maintenance_date":
          return g.maintenance_date || "";
        default:
          return "";
      }
    };
    // Tomme værdier sorteres altid sidst, uanset retning
    const isEmpty = (v: string | number) => v === "" || v === undefined || v === null;
    return [...filtered].sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      const ae = isEmpty(av);
      const be = isEmpty(bv);
      if (ae && be) return a.name.localeCompare(b.name);
      if (ae) return 1;
      if (be) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30 inline" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-teamb-orange inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teamb-orange inline" />
    );
  };

  const handlePrint = () => {
    const colorDotHtml = (c: string | null) => {
      if (!c) return "";
      const hex = resolveColorCode(c) || COLOR_DOT_FALLBACK;
      return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${hex};margin-right:5px;vertical-align:middle"></span>`;
    };
    const rows = sorted
      .map(
        (item) => `<tr>
        <td>${item.name}</td>
        <td>${item.geartype?.name || "–"}</td>
        <td style="color:${item.out_of_service ? "#ef4444" : "#22c55e"}">${
          item.out_of_service ? "Ude af drift" : "I drift"
        }</td>
        <td>${item.location || "–"}</td>
        <td>${colorDotHtml(item.color_code)}${item.color_code || "–"}</td>
        <td>${item.frequency || "–"}</td>
        <td>${item.serial_numbers || "–"}</td>
        <td>${item.emei_number || "–"}</td>
        <td>${formatDate(item.maintenance_date)}${
          item.next_checkup
            ? '<br><small style="color:#3b82f6">Checkup: ' + formatDate(item.next_checkup) + "</small>"
            : ""
        }${
          item.maintenance_note
            ? '<br><small style="color:#888">' + item.maintenance_note + "</small>"
            : ""
        }${
          item.battery_change_date
            ? '<br><small style="color:#eab308">Batteri: ' + formatDate(item.battery_change_date) + "</small>"
            : ""
        }</td>
      </tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>TeamLazer Frekvens-oversigt</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #222; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 9px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: #fff; text-align: left; padding: 4px 6px; font-size: 9px; text-transform: uppercase; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; white-space: nowrap; }
  tr:nth-child(even) { background: #f8f8f8; }
</style></head><body>
<h1>TeamLazer Frekvens-oversigt</h1>
<div class="meta">Udskrevet: ${new Date().toLocaleDateString("da-DK")} &bull; ${counts.displays} Displays, ${counts.kasters} Kastere, ${counts.gevaer} Gevær</div>
<table>
  <thead><tr><th>Navn</th><th>Type</th><th>Status</th><th>Sted</th><th>Farve</th><th>Frekvens</th><th>Serienr.</th><th>IMEI</th><th>Vedligehold</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.setTimeout(() => w.print(), 400);
    }
  };

  const th =
    "px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/60 whitespace-nowrap cursor-pointer select-none hover:text-white";
  const td = "px-2 py-1.5 text-white whitespace-nowrap";

  const stats: { key: UnitFilter; label: string; count: number; icon: typeof Monitor }[] = [
    { key: "displays", label: "Displays", count: counts.displays, icon: Monitor },
    { key: "kasters", label: "Kastere", count: counts.kasters, icon: Crosshair },
    { key: "gevaer", label: "Gevær", count: counts.gevaer, icon: Gauge },
  ];

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="tile-label text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-white" />
          Frekvens-oversigt ({filtered.length})
        </h2>
        <button type="button" onClick={handlePrint} className="ghost-btn whitespace-nowrap">
          <Printer className="w-4 h-4 text-white" />
          Print / PDF
        </button>
      </div>

      {/* Klikbare filtre pr. enhedstype */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stats.map(({ key, label, count, icon: Icon }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(active ? "all" : key)}
              className={`rounded-lg border p-2.5 text-center transition-all ${
                active
                  ? "border-teamb-orange ring-1 ring-teamb-orange/40 bg-teamb-orange/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <div className={`text-xl font-bold ${active ? "text-teamb-orange" : "text-white"}`}>
                {count}
              </div>
              <div
                className={`text-[10px] flex items-center justify-center gap-1 ${
                  active ? "text-teamb-orange" : "text-white/50"
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
              </div>
            </button>
          );
        })}
      </div>
      {filter !== "all" && (
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="text-xs text-white/50 hover:text-white underline mb-2"
        >
          Vis alle ({items.length})
        </button>
      )}

      {sorted.length === 0 ? (
        <div className="text-center text-white/40 text-sm py-10">Ingen enheder i listen.</div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th} onClick={() => toggleSort("name")}>
                  Navn <SortIcon col="name" />
                </th>
                <th className={th} onClick={() => toggleSort("type")}>
                  Type <SortIcon col="type" />
                </th>
                <th className={th} onClick={() => toggleSort("status")}>
                  Status <SortIcon col="status" />
                </th>
                <th className={th} onClick={() => toggleSort("location")}>
                  Sted <SortIcon col="location" />
                </th>
                <th className={th} onClick={() => toggleSort("color_code")}>
                  Farve <SortIcon col="color_code" />
                </th>
                <th className={th} onClick={() => toggleSort("frequency")}>
                  Frekvens <SortIcon col="frequency" />
                </th>
                <th className={th} onClick={() => toggleSort("serial_numbers")}>
                  Serienr. <SortIcon col="serial_numbers" />
                </th>
                <th className={th} onClick={() => toggleSort("emei_number")}>
                  IMEI <SortIcon col="emei_number" />
                </th>
                <th className={th} onClick={() => toggleSort("maintenance_date")}>
                  Vedligehold <SortIcon col="maintenance_date" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => {
                const loc = (g.location || "").toLowerCase();
                const isEast = /^(øst|ost)$/.test(loc);
                const isWest = /^vest$/.test(loc);
                return (
                  <tr
                    key={g.id}
                    className={`border-b border-white/5 hover:bg-white/[0.03] ${
                      g.out_of_service ? "opacity-60" : ""
                    }`}
                  >
                    <td className={`${td} font-medium`}>{g.name}</td>
                    <td className={`${td} text-white/70`}>{g.geartype?.name || "–"}</td>
                    <td className={td}>
                      <span className={`chip ${g.out_of_service ? "chip-bad" : "chip-ok"}`}>
                        {g.out_of_service ? "Ude af drift" : "I drift"}
                      </span>
                    </td>
                    <td className={td}>
                      {g.location ? (
                        <span
                          className={`chip ${
                            isEast
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : isWest
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                                : "bg-white/10 text-white/70 border border-white/20"
                          }`}
                        >
                          {g.location}
                        </span>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                    <td className={td}>
                      {g.color_code ? (
                        <span className="inline-flex items-center">
                          <ColorDot color={g.color_code} />
                          <span className="text-white/80">{g.color_code}</span>
                        </span>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                    <td className={td}>
                      {g.frequency ? (
                        <span className="font-bold text-teamb-orange">{g.frequency}</span>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                    <td className={`${td} font-mono text-white/70`}>
                      {g.serial_numbers || <span className="text-white/30">–</span>}
                    </td>
                    <td className={`${td} font-mono text-white/70`}>
                      {g.emei_number || <span className="text-white/30">–</span>}
                    </td>
                    <td className={`${td} text-white/70`}>
                      <span>{formatDate(g.maintenance_date)}</span>
                      {g.next_checkup && (
                        <span className="block text-[10px] text-blue-300">
                          Checkup: {formatDate(g.next_checkup)}
                        </span>
                      )}
                      {g.battery_change_date && (
                        <span className="block text-[10px] text-yellow-300">
                          Batteri: {formatDate(g.battery_change_date)}
                        </span>
                      )}
                      {g.maintenance_note && (
                        <span className="block text-[10px] text-white/40">{g.maintenance_note}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
