import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  FileDown,
  Filter,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  createTablet,
  deleteTablet,
  listTablets,
  updateTablet,
  type Tablet,
} from "@/lib/tabletsApi";

const TABLET_COLORS: readonly {
  key: string;
  label: string;
  hex: string;
  border?: boolean;
}[] = [
  { key: "hvid", label: "Hvid", hex: "#ffffff", border: true },
  { key: "blå", label: "Blå", hex: "#3b82f6" },
  { key: "gul", label: "Gul", hex: "#eab308" },
  { key: "rød", label: "Rød", hex: "#ef4444" },
  { key: "orange", label: "Orange", hex: "#f97316" },
  { key: "grøn", label: "Grøn", hex: "#22c55e" },
  { key: "lilla", label: "Lilla", hex: "#a855f7" },
  { key: "sort", label: "Sort", hex: "#171717", border: true },
  { key: "pink", label: "Pink", hex: "#ec4899" },
  { key: "grå", label: "Grå", hex: "#6b7280" },
];

const PLACERING_OPTIONS = ["Øst", "Vest"] as const;

type SortKey =
  | "number"
  | "box_number"
  | "color"
  | "placering"
  | "model"
  | "mobile_subscription"
  | "notes";

function ColorDot({
  colorKey,
  selected,
  onClick,
  size = "md",
}: {
  colorKey: string | null;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const color = TABLET_COLORS.find((c) => c.key === colorKey);
  if (!color) return null;
  const px = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <button
      type="button"
      onClick={onClick}
      title={color.label}
      className={`${px} rounded-full transition-all flex-shrink-0 ${
        selected
          ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-teamb-orange scale-110"
          : "hover:scale-110"
      } ${color.border ? "border border-gray-500" : ""}`}
      style={{ backgroundColor: color.hex }}
    />
  );
}

function ColorPicker({
  value,
  onChange,
  size = "md",
}: {
  value: string | null;
  onChange: (color: string | null) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABLET_COLORS.map((c) => (
        <ColorDot
          key={c.key}
          colorKey={c.key}
          selected={value === c.key}
          onClick={() => onChange(value === c.key ? null : c.key)}
          size={size}
        />
      ))}
    </div>
  );
}

function ColorBadge({ colorKey }: { colorKey: string | null }) {
  const color = TABLET_COLORS.find((c) => c.key === colorKey);
  if (!color) return <span className="text-gray-500">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-4 h-4 rounded-full inline-block flex-shrink-0 ${
          color.border ? "border border-gray-500" : ""
        }`}
        style={{ backgroundColor: color.hex }}
      />
      <span className="text-gray-300 text-sm">{color.label}</span>
    </div>
  );
}

export default function TabletsList() {
  const [tablets, setTablets] = useState<Tablet[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [newBoxNumber, setNewBoxNumber] = useState("");
  const [newPlacering, setNewPlacering] = useState<string | null>(null);
  const [newSubscription, setNewSubscription] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editModel, setEditModel] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editBoxNumber, setEditBoxNumber] = useState("");
  const [editPlacering, setEditPlacering] = useState<string | null>(null);
  const [editSubscription, setEditSubscription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Multi-edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMultiEdit, setShowMultiEdit] = useState(false);
  const [multiColor, setMultiColor] = useState<string | null | undefined>(undefined);
  const [multiPlacering, setMultiPlacering] = useState<string | null | undefined>(undefined);
  const [multiBoxNumber, setMultiBoxNumber] = useState<string | undefined>(undefined);
  const [multiSubscription, setMultiSubscription] = useState<string | undefined>(undefined);
  const [multiSaving, setMultiSaving] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // PDF modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfSortKey, setPdfSortKey] = useState<SortKey>("number");
  const [pdfSortDir, setPdfSortDir] = useState<"asc" | "desc">("asc");
  const [pdfFilterColor, setPdfFilterColor] = useState<string | null>(null);
  const [pdfFilterPlacering, setPdfFilterPlacering] = useState<string | null>(null);

  const colorLabel = (key: string | null) =>
    TABLET_COLORS.find((c) => c.key === key)?.label || "";
  const colorHex = (key: string | null) =>
    TABLET_COLORS.find((c) => c.key === key)?.hex || "";

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tablets) {
      const sub = (t.mobile_subscription || "").trim().toUpperCase();
      if (sub) counts[sub] = (counts[sub] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tablets]);

  const sortedTablets = useMemo(() => {
    const list = [...tablets];
    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortKey) {
        case "number":
          va = a.number;
          vb = b.number;
          break;
        case "box_number":
          va = a.box_number ?? 99;
          vb = b.box_number ?? 99;
          break;
        case "color":
          va = colorLabel(a.color);
          vb = colorLabel(b.color);
          break;
        case "placering":
          va = (a.placering || "").toLowerCase();
          vb = (b.placering || "").toLowerCase();
          break;
        case "model":
          va = a.model.toLowerCase();
          vb = b.model.toLowerCase();
          break;
        case "mobile_subscription":
          va = (a.mobile_subscription || "").toLowerCase();
          vb = (b.mobile_subscription || "").toLowerCase();
          break;
        case "notes":
          va = (a.notes || "").toLowerCase();
          vb = (b.notes || "").toLowerCase();
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [tablets, sortKey, sortDir]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setTablets(await listTablets());
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newModel.trim() || newNumber.length !== 2) return;
    setSaving(true);
    const result = await createTablet({
      model: newModel.trim(),
      number: newNumber,
      box_number: newBoxNumber ? Number(newBoxNumber) : null,
      color: newColor,
      placering: newPlacering,
      mobile_subscription: newSubscription.trim() || null,
      notes: newNotes.trim() || null,
    });
    if (result) {
      setNewModel("");
      setNewNumber("");
      setNewBoxNumber("");
      setNewColor(null);
      setNewPlacering(null);
      setNewSubscription("");
      setNewNotes("");
      setShowCreate(false);
      await load();
    }
    setSaving(false);
  };

  const startEdit = (t: Tablet) => {
    setEditId(t.id);
    setEditModel(t.model);
    setEditNumber(t.number);
    setEditColor(t.color);
    setEditBoxNumber(t.box_number ? String(t.box_number) : "");
    setEditPlacering(t.placering);
    setEditSubscription(t.mobile_subscription || "");
    setEditNotes(t.notes || "");
  };

  const cancelEdit = () => setEditId(null);

  const handleUpdate = async () => {
    if (!editId || !editModel.trim() || editNumber.length !== 2) return;
    const result = await updateTablet(editId, {
      model: editModel.trim(),
      number: editNumber,
      box_number: editBoxNumber ? Number(editBoxNumber) : null,
      color: editColor,
      placering: editPlacering,
      mobile_subscription: editSubscription.trim() || null,
      notes: editNotes.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (result) {
      setEditId(null);
      await load();
    }
  };

  const handleDuplicate = async (t: Tablet) => {
    const usedNumbers = new Set(tablets.map((tab) => tab.number));
    let nextNum = "";
    for (let i = 1; i <= 99; i++) {
      const candidate = String(i).padStart(2, "0");
      if (!usedNumbers.has(candidate)) {
        nextNum = candidate;
        break;
      }
    }
    if (!nextNum) return;
    const result = await createTablet({
      model: t.model,
      number: nextNum,
      box_number: t.box_number,
      color: t.color,
      placering: t.placering,
      mobile_subscription: t.mobile_subscription,
      notes: t.notes,
    });
    if (result) await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på du vil slette denne tablet?")) return;
    await deleteTablet(id);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tablets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tablets.map((t) => t.id)));
  };

  const openMultiEdit = () => {
    setMultiColor(undefined);
    setMultiPlacering(undefined);
    setMultiBoxNumber(undefined);
    setMultiSubscription(undefined);
    setShowMultiEdit(true);
  };

  const handleMultiEdit = async () => {
    if (selectedIds.size === 0) return;
    setMultiSaving(true);
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (multiColor !== undefined) updates.color = multiColor;
    if (multiPlacering !== undefined) updates.placering = multiPlacering;
    if (multiBoxNumber !== undefined)
      updates.box_number = multiBoxNumber ? Number(multiBoxNumber) : null;
    if (multiSubscription !== undefined)
      updates.mobile_subscription = multiSubscription.trim() || null;

    if (Object.keys(updates).length <= 1) {
      setMultiSaving(false);
      return;
    }

    await Promise.all(
      Array.from(selectedIds).map((id) => updateTablet(id, updates as Partial<Tablet>)),
    );
    setShowMultiEdit(false);
    setSelectedIds(new Set());
    setMultiSaving(false);
    await load();
  };

  const openPdfModal = () => {
    setPdfSortKey(sortKey);
    setPdfSortDir(sortDir);
    setPdfFilterColor(null);
    setPdfFilterPlacering(null);
    setShowPdfModal(true);
  };

  const exportPdf = () => {
    let list = [...tablets];
    if (pdfFilterColor) list = list.filter((t) => t.color === pdfFilterColor);
    if (pdfFilterPlacering) list = list.filter((t) => t.placering === pdfFilterPlacering);

    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (pdfSortKey) {
        case "number":
          va = a.number;
          vb = b.number;
          break;
        case "box_number":
          va = a.box_number ?? 99;
          vb = b.box_number ?? 99;
          break;
        case "color":
          va = colorLabel(a.color);
          vb = colorLabel(b.color);
          break;
        case "placering":
          va = a.placering || "";
          vb = b.placering || "";
          break;
        case "model":
          va = a.model.toLowerCase();
          vb = b.model.toLowerCase();
          break;
        case "mobile_subscription":
          va = (a.mobile_subscription || "").toLowerCase();
          vb = (b.mobile_subscription || "").toLowerCase();
          break;
        case "notes":
          va = (a.notes || "").toLowerCase();
          vb = (b.notes || "").toLowerCase();
          break;
      }
      if (va < vb) return pdfSortDir === "asc" ? -1 : 1;
      if (va > vb) return pdfSortDir === "asc" ? 1 : -1;
      return 0;
    });

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Tablets", 14, 18);
    doc.setFontSize(9);

    const filters: string[] = [];
    if (pdfFilterColor) filters.push(`Farve: ${colorLabel(pdfFilterColor)}`);
    if (pdfFilterPlacering) filters.push(`Placering: ${pdfFilterPlacering}`);
    const sortLabel = {
      number: "Nr.",
      box_number: "Box",
      color: "Farve",
      placering: "Placering",
      model: "Model",
      mobile_subscription: "Mobilabonnement",
      notes: "Noter",
    }[pdfSortKey];
    const subtitle = `Eksporteret ${new Date().toLocaleDateString("da-DK")}  |  Sorteret: ${sortLabel} (${pdfSortDir === "asc" ? "stigende" : "faldende"})${filters.length ? "  |  " + filters.join(", ") : ""}`;
    doc.text(subtitle, 14, 24);

    const COLOR_COL = 2;

    const body = list.map((t) => [
      t.number,
      t.box_number ?? "—",
      "",
      t.placering || "—",
      t.model,
      t.mobile_subscription || "—",
      t.notes || "—",
    ]);

    const rowColorMap = list.map((t) => ({
      hex: colorHex(t.color),
      label: colorLabel(t.color),
      border: TABLET_COLORS.find((c) => c.key === t.color)?.border || false,
    }));

    autoTable(doc, {
      startY: 30,
      head: [["Nr.", "Box", "Farve", "Placering", "Model", "Mobilabonnement", "Noter"]],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22] },
      columnStyles: { [COLOR_COL]: { cellWidth: 28 } },
      didDrawCell: (data: { section: string; column: { index: number }; row: { index: number }; cell: { x: number; y: number; height: number } }) => {
        if (data.section === "body" && data.column.index === COLOR_COL) {
          const info = rowColorMap[data.row.index];
          if (info && info.hex) {
            const cx = data.cell.x + 5;
            const cy = data.cell.y + data.cell.height / 2;
            const r = 3;
            const hex = info.hex.replace("#", "");
            const cr = parseInt(hex.substring(0, 2), 16);
            const cg = parseInt(hex.substring(2, 4), 16);
            const cb = parseInt(hex.substring(4, 6), 16);
            doc.setFillColor(cr, cg, cb);
            doc.circle(cx, cy, r, "F");
            if (info.border) {
              doc.setDrawColor(160, 160, 160);
              doc.setLineWidth(0.3);
              doc.circle(cx, cy, r, "S");
            }
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(8);
            doc.text(info.label, cx + r + 2, cy + 1);
          } else {
            doc.setTextColor(160, 160, 160);
            doc.setFontSize(8);
            doc.text("—", data.cell.x + 5, data.cell.y + data.cell.height / 2 + 1);
          }
        }
      },
    });

    doc.save("tablets.pdf");
    setShowPdfModal(false);
  };

  const isMultiMode = selectedIds.size > 0;

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex-1 flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
        >
          <span className="tile-label text-white flex items-center gap-3">
            Tablets ({tablets.length})
            {providerCounts.length > 0 && (
              <span className="flex items-center gap-1.5 flex-wrap">
                {providerCounts.map(([provider, count]) => (
                  <span
                    key={provider}
                    className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-gray-300 normal-case tracking-normal"
                  >
                    <span className="text-white font-semibold">{provider}</span>
                    <span className="bg-teamb-orange text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px] text-center">
                      {count}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </span>
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-white/50" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/50" />
          )}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {isMultiMode && (
              <button
                onClick={openMultiEdit}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                <Pencil className="w-4 h-4" />
                Rediger {selectedIds.size} valgte
              </button>
            )}
            <button
              onClick={openPdfModal}
              disabled={tablets.length === 0}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-teamb-orange hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Tilføj
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          {showCreate && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-base font-semibold text-white mb-3">Ny tablet</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Model *</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="f.eks. Samsung Galaxy Tab A9"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nummer (2 cifre) *</label>
                  <input
                    type="text"
                    value={newNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setNewNumber(v);
                    }}
                    placeholder="01"
                    maxLength={2}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Boxnummer (1-9)</label>
                  <input
                    type="text"
                    value={newBoxNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^1-9]/g, "").slice(0, 1);
                      setNewBoxNumber(v);
                    }}
                    placeholder="1"
                    maxLength={1}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Placering</label>
                  <div className="flex gap-2 mt-1">
                    {PLACERING_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPlacering(newPlacering === p ? null : p)}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                          newPlacering === p
                            ? "bg-teamb-orange text-white"
                            : "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mobilabonnement</label>
                  <input
                    type="text"
                    value={newSubscription}
                    onChange={(e) => setNewSubscription(e.target.value)}
                    placeholder="f.eks. Telia 20GB"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Noter</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Valgfri noter"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">Farve</label>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newModel.trim() || newNumber.length !== 2}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded transition"
                >
                  {saving ? "Gemmer..." : "Gem"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
                >
                  Annuller
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-gray-400 text-center py-8">Indlæser...</div>
          ) : tablets.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Ingen tablets registreret endnu.
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800 text-gray-300 text-sm">
                    <th className="px-3 py-3 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-400 hover:text-white transition"
                        title={
                          selectedIds.size === tablets.length
                            ? "Fravælg alle"
                            : "Vælg alle"
                        }
                      >
                        {selectedIds.size === tablets.length && tablets.length > 0 ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    {(
                      [
                        ["number", "Nr."],
                        ["box_number", "Box"],
                        ["color", "Farve"],
                        ["placering", "Placering"],
                        ["model", "Model"],
                        ["mobile_subscription", "Mobilabonnement"],
                        ["notes", "Noter"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        className="text-left px-4 py-3 cursor-pointer select-none hover:text-white transition"
                        onClick={() => toggleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortKey === key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="text-right px-4 py-3">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTablets.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-t border-gray-800 hover:bg-gray-800/50 transition ${
                        selectedIds.has(t.id) ? "bg-gray-800/40" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleSelect(t.id)}
                          className="text-gray-400 hover:text-white transition"
                        >
                          {selectedIds.has(t.id) ? (
                            <CheckSquare className="w-4 h-4 text-teamb-orange" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      {editId === t.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editNumber}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                                setEditNumber(v);
                              }}
                              maxLength={2}
                              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editBoxNumber}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^1-9]/g, "").slice(0, 1);
                                setEditBoxNumber(v);
                              }}
                              maxLength={1}
                              className="w-12 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ColorPicker value={editColor} onChange={setEditColor} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {PLACERING_OPTIONS.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() =>
                                    setEditPlacering(editPlacering === p ? null : p)
                                  }
                                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                                    editPlacering === p
                                      ? "bg-teamb-orange text-white"
                                      : "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700"
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editModel}
                              onChange={(e) => setEditModel(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editSubscription}
                              onChange={(e) => setEditSubscription(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={handleUpdate}
                                disabled={!editModel.trim() || editNumber.length !== 2}
                                className="text-green-400 hover:text-green-300 disabled:opacity-50"
                                title="Gem"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-white"
                                title="Annuller"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-white font-mono font-bold">
                            {t.number}
                          </td>
                          <td className="px-4 py-3 text-white font-mono">
                            {t.box_number || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <ColorBadge colorKey={t.color} />
                          </td>
                          <td className="px-4 py-3">
                            {t.placering ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  t.placering === "Øst"
                                    ? "bg-blue-900/50 text-blue-300 border border-blue-700"
                                    : "bg-amber-900/50 text-amber-300 border border-amber-700"
                                }`}
                              >
                                {t.placering}
                              </span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white">{t.model}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {t.mobile_subscription || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {t.notes || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(t)}
                                className="text-gray-400 hover:text-teamb-orange transition"
                                title="Rediger"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(t)}
                                className="text-gray-400 hover:text-blue-400 transition"
                                title="Kopier"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="text-gray-400 hover:text-red-400 transition"
                                title="Slet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Multi-edit modal */}
      {showMultiEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-1">
              Rediger {selectedIds.size} tablets
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Kun felter du udfylder bliver opdateret.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Placering</label>
              <div className="flex gap-2">
                {PLACERING_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setMultiPlacering(multiPlacering === p ? undefined : p)
                    }
                    className={`px-4 py-2 rounded text-sm font-medium transition ${
                      multiPlacering === p
                        ? "bg-teamb-orange text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setMultiPlacering(multiPlacering === null ? undefined : null)
                  }
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    multiPlacering === null
                      ? "bg-teamb-orange text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Fjern
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Farve</label>
              <ColorPicker
                value={multiColor === undefined ? null : multiColor}
                onChange={(c) => setMultiColor(c)}
              />
              {multiColor !== undefined && (
                <button
                  onClick={() => setMultiColor(undefined)}
                  className="text-xs text-gray-500 hover:text-gray-300 mt-1"
                >
                  Nulstil (ændr ikke farve)
                </button>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Boxnummer (1-9)</label>
              <input
                type="text"
                value={multiBoxNumber ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^1-9]/g, "").slice(0, 1);
                  setMultiBoxNumber(v === "" ? undefined : v);
                }}
                placeholder="Uændret"
                maxLength={1}
                className="w-24 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Mobilabonnement</label>
              <input
                type="text"
                value={multiSubscription ?? ""}
                onChange={(e) => {
                  setMultiSubscription(e.target.value === "" ? undefined : e.target.value);
                }}
                placeholder="Uændret"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleMultiEdit}
                disabled={multiSaving}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded transition"
              >
                {multiSaving ? "Gemmer..." : "Gem ændringer"}
              </button>
              <button
                onClick={() => setShowMultiEdit(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF export modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Filter className="w-5 h-5 text-teamb-orange" />
              Eksporter PDF
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Vælg sortering og filtrering inden eksport.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Sorter efter</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["number", "Nr."],
                    ["box_number", "Box"],
                    ["color", "Farve"],
                    ["placering", "Placering"],
                    ["model", "Model"],
                    ["mobile_subscription", "Abonnement"],
                    ["notes", "Noter"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPdfSortKey(key)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                      pdfSortKey === key
                        ? "bg-teamb-orange text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Retning</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPdfSortDir("asc")}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-1 ${
                    pdfSortDir === "asc"
                      ? "bg-teamb-orange text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <ArrowUp className="w-3 h-3" /> Stigende
                </button>
                <button
                  onClick={() => setPdfSortDir("desc")}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-1 ${
                    pdfSortDir === "desc"
                      ? "bg-teamb-orange text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <ArrowDown className="w-3 h-3" /> Faldende
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Filtrer efter farve</label>
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={() => setPdfFilterColor(null)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    pdfFilterColor === null
                      ? "bg-teamb-orange text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Alle
                </button>
                {TABLET_COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() =>
                      setPdfFilterColor(pdfFilterColor === c.key ? null : c.key)
                    }
                    title={c.label}
                    className={`w-7 h-7 rounded-full transition-all flex-shrink-0 ${
                      pdfFilterColor === c.key
                        ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-teamb-orange scale-110"
                        : "hover:scale-110"
                    } ${c.border ? "border border-gray-500" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">Filtrer efter placering</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPdfFilterPlacering(null)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                    pdfFilterPlacering === null
                      ? "bg-teamb-orange text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Alle
                </button>
                {PLACERING_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setPdfFilterPlacering(pdfFilterPlacering === p ? null : p)
                    }
                    className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                      pdfFilterPlacering === p
                        ? "bg-teamb-orange text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              {(() => {
                const count = tablets.filter(
                  (t) =>
                    (!pdfFilterColor || t.color === pdfFilterColor) &&
                    (!pdfFilterPlacering || t.placering === pdfFilterPlacering),
                ).length;
                return `${count} tablet${count !== 1 ? "s" : ""} vil blive eksporteret`;
              })()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportPdf}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
              >
                <FileDown className="w-4 h-4" />
                Eksporter PDF
              </button>
              <button
                onClick={() => setShowPdfModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
