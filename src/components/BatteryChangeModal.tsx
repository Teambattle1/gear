import { useMemo } from "react";
import { BatteryCharging, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveColorCode } from "@/lib/activityIcons";

export type BatteryRow = {
  setName: string;
  colorCode: string | null;
  role: string; // fx "Display", "Kaster"
  unitName: string; // navn på den tildelte enhed
  batteryDate: string | null;
  batteryModel: string | null;
};

// #rrggbb / #rgb → [r,g,b] til jsPDF-farver. Returnerer null hvis ikke en hex.
function hexToRgb(hex: string | null): [number, number, number] | null {
  if (!hex || !hex.startsWith("#")) return null;
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function BatteryChangeModal({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: BatteryRow[];
  onClose: () => void;
}) {
  // Sorter efter sæt, derefter type (Display før Kaster)
  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          a.setName.localeCompare(b.setName, "da") ||
          a.role.localeCompare(b.role, "da"),
      ),
    [rows],
  );

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFontSize(16);
    doc.text(`Batteriskifte — ${title}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120);
    const stamp = new Date().toLocaleDateString("da-DK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Genereret ${stamp}`, 14, 24);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 30,
      head: [["Sæt / farve", "Type", "Enhed", "Seneste batteriskift", "Batteri-model"]],
      body: sorted.map((r) => [
        r.setName,
        r.role,
        r.unitName || "—",
        r.batteryDate || "—",
        r.batteryModel || "—",
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [255, 102, 0], textColor: 255 },
      // ekstra venstre-padding på kolonne 0 så farve-swatchen får plads
      columnStyles: {
        0: { cellWidth: 44, cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 7 } },
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const row = sorted[data.row.index];
          const rgb = hexToRgb(resolveColorCode(row.colorCode));
          if (rgb) {
            const cx = data.cell.x + 3.2;
            const cy = data.cell.y + data.cell.height / 2;
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.circle(cx, cy, 1.6, "F");
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.circle(cx, cy, 1.6, "S");
          }
        }
      },
    });

    doc.save(`batteriskifte-${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative h-full overflow-y-auto p-4 md:p-8">
        <div className="panel max-w-3xl mx-auto p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="page-title text-xl flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-teamb-orange" />
              Batteriskifte
            </h2>
            <button onClick={onClose} className="back-btn">
              Luk
            </button>
          </div>

          <p className="text-sm text-white/60 mb-4">
            {title} — {sorted.length} enhed{sorted.length === 1 ? "" : "er"} (Display + Kaster)
          </p>

          {sorted.length === 0 ? (
            <p className="text-white/50 text-sm py-8 text-center">
              Ingen Display eller Kaster er tildelt et sæt endnu.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/50 text-xs uppercase tracking-wider bg-white/5">
                    <th className="p-2">Sæt / farve</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Enhed</th>
                    <th className="p-2">Seneste skift</th>
                    <th className="p-2">Batteri-model</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="p-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{
                              background: resolveColorCode(r.colorCode) || "transparent",
                            }}
                          />
                          {r.setName}
                        </span>
                      </td>
                      <td className="p-2">{r.role}</td>
                      <td className="p-2 text-white/80">{r.unitName || "—"}</td>
                      <td className="p-2">
                        {r.batteryDate || <span className="text-white/30">—</span>}
                      </td>
                      <td className="p-2">
                        {r.batteryModel || <span className="text-white/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="ghost-btn">
              Annuller
            </button>
            <button
              onClick={exportPdf}
              disabled={sorted.length === 0}
              className="primary-btn flex items-center gap-2 disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
