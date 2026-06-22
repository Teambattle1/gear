import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, ChevronDown, ChevronRight, Save } from "lucide-react";
import { getShoppingNote, upsertShoppingNote } from "@/lib/gearApi";

/**
 * Indkøbsnote pr. aktivitet: hvad der skal købes ind (batterier, reservedele),
 * reparatør-info og links. Knyttet til activitySlug, så hver aktivitet har sin
 * egen tekst. Flyttet fra FLOW's TeamLazer-admin (gear_shopping_notes).
 */
export default function ShoppingNote({ activitySlug }: { activitySlug: string }) {
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activitySlug) return;
    getShoppingNote(activitySlug).then((n) => {
      setNote(n);
      setDraft(n);
    });
  }, [activitySlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertShoppingNote(activitySlug, draft.trim());
      setNote(draft.trim());
      setOpen(false);
      toast.success("Indkøbsnote gemt");
    } catch {
      toast.error("Kunne ikke gemme indkøbsnote");
    } finally {
      setSaving(false);
    }
  };

  const hasNote = note.trim().length > 0;

  return (
    <div className="panel">
      <button
        onClick={() => {
          setDraft(note);
          setOpen((v) => !v);
        }}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-teamb-orange/15 border border-teamb-orange/30 shrink-0">
          <ShoppingCart className="w-4 h-4 text-white" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="tile-label text-white block">Indkøb</span>
          <span className="text-xs text-white/50 block truncate">
            {hasNote ? note : "Hvad skal købes ind? Batterier, reservedele, reparatør …"}
          </span>
        </span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-white/50 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <textarea
            className="input min-h-[140px] resize-y"
            placeholder="Fx: Batteri til displays (link), reparatør, kontaktperson …"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="primary-btn">
              <Save className="w-4 h-4 text-white" />
              {saving ? "Gemmer…" : "Gem"}
            </button>
            <button
              onClick={() => {
                setDraft(note);
                setOpen(false);
              }}
              className="ghost-btn"
            >
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
