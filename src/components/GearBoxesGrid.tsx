import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ensureGearBoxesForGear,
  updateGearBox,
  type GearBox,
} from "@/lib/gearApi";

export default function GearBoxesGrid({
  gearId,
  defaultOpen = true,
}: {
  gearId: string;
  defaultOpen?: boolean;
}) {
  const [boxes, setBoxes] = useState<GearBox[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const ready = await ensureGearBoxesForGear(gearId);
      setBoxes(ready);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke hente bokse");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, gearId]);

  const toggle = async (box: GearBox) => {
    try {
      const updated = await updateGearBox(box.id, {
        out_of_service: !box.out_of_service,
      });
      setBoxes((arr) => arr.map((b) => (b.id === box.id ? updated : b)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opdatere boks");
    }
  };

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="input-label">Bokse (9 stk.)</h3>
        <button onClick={() => setOpen((v) => !v)} className="ghost-btn text-xs">
          {open ? "Skjul" : "Vis bokse"}
        </button>
      </div>
      {open &&
        (loading ? (
          <div className="text-sm text-white/40">Henter…</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {boxes.map((b) => (
              <button
                key={b.id}
                onClick={() => toggle(b)}
                className={`h-12 rounded-lg text-xs font-bold border transition-all ${
                  b.out_of_service
                    ? "bg-red-500/25 text-red-300 border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                }`}
                title={b.out_of_service ? "Ude af drift" : "I drift"}
              >
                {b.name}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
