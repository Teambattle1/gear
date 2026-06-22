import { useMemo, useState } from "react";
import { Link2, Unlink, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createGearLink,
  deleteGearLink,
  type Gear,
  type GearLink,
} from "@/lib/gearApi";

/**
 * Parring af Display ↔ Kaster (gear_links). Flyttet fra FLOW's TeamLazer-admin.
 * En parring binder ét display til én kaster, så de kan holdes sammen (fx
 * lokations-sync). Hver enhed kan kun indgå i én parring.
 */
export default function GearPairing({
  displays,
  kasters,
  links,
  onChanged,
}: {
  displays: Gear[];
  kasters: Gear[];
  links: GearLink[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newDisplay, setNewDisplay] = useState("");
  const [newKaster, setNewKaster] = useState("");
  const [saving, setSaving] = useState(false);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of [...displays, ...kasters]) m.set(g.id, g.name);
    return m;
  }, [displays, kasters]);

  // Enheder der allerede indgår i en parring kan ikke vælges igen
  const linkedDisplayIds = useMemo(
    () => new Set(links.map((l) => l.display_id)),
    [links],
  );
  const linkedKasterIds = useMemo(
    () => new Set(links.map((l) => l.kaster_id)),
    [links],
  );
  const freeDisplays = displays.filter((d) => !linkedDisplayIds.has(d.id));
  const freeKasters = kasters.filter((k) => !linkedKasterIds.has(k.id));

  const handleCreate = async () => {
    if (!newDisplay || !newKaster) return;
    setSaving(true);
    try {
      await createGearLink(newDisplay, newKaster);
      setNewDisplay("");
      setNewKaster("");
      toast.success("Parring oprettet");
      onChanged();
    } catch {
      toast.error("Kunne ikke oprette parring");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    setSaving(true);
    try {
      await deleteGearLink(linkId);
      toast.success("Parring fjernet");
      onChanged();
    } catch {
      toast.error("Kunne ikke fjerne parring");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-teamb-orange/15 border border-teamb-orange/30 shrink-0">
          <Link2 className="w-4 h-4 text-white" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="tile-label text-white block">Parring · Display ↔ Kaster</span>
          <span className="text-xs text-white/50 block truncate">
            {links.length} parring{links.length === 1 ? "" : "er"}
          </span>
        </span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-white/50 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Eksisterende parringer */}
          {links.length === 0 ? (
            <p className="text-sm text-white/40">Ingen parringer endnu.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2"
                >
                  <span className="text-sm text-white/90 flex-1 min-w-0 truncate">
                    {nameById.get(l.display_id) || "(ukendt display)"}
                    <span className="text-teamb-orange px-2">↔</span>
                    {nameById.get(l.kaster_id) || "(ukendt kaster)"}
                  </span>
                  <button
                    type="button"
                    title="Fjern parring"
                    onClick={() => handleDelete(l.id)}
                    disabled={saving}
                    className="shrink-0 p-2 text-red-300/60 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Opret ny parring */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="input-label">Display</label>
              <select
                className="input"
                value={newDisplay}
                onChange={(e) => setNewDisplay(e.target.value)}
              >
                <option value="">— Vælg display —</option>
                {freeDisplays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Kaster</label>
              <select
                className="input"
                value={newKaster}
                onChange={(e) => setNewKaster(e.target.value)}
              >
                <option value="">— Vælg kaster —</option>
                {freeKasters.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !newDisplay || !newKaster}
              className="primary-btn disabled:opacity-40"
            >
              <Plus className="w-4 h-4 text-white" />
              Par
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
