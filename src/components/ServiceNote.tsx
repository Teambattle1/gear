import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench, ChevronDown, ChevronRight, Save } from "lucide-react";
import { getServiceNote, upsertServiceNote } from "@/lib/gearApi";

/**
 * Service-note pr. aktivitet: hvor og hvordan gearet serviceres.
 * Vises øverst på hver gear-side. Noten er knyttet til activitySlug,
 * så hver aktivitet har sin egen tekst.
 */
export default function ServiceNote({ activitySlug }: { activitySlug: string }) {
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activitySlug) return;
    getServiceNote(activitySlug).then((n) => {
      setNote(n);
      setDraft(n);
    });
  }, [activitySlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertServiceNote(activitySlug, draft.trim());
      setNote(draft.trim());
      setOpen(false);
      toast.success("Service-note gemt");
    } catch {
      toast.error("Kunne ikke gemme service-note");
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
          <Wrench className="w-4 h-4 text-white" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="tile-label text-white block">Service</span>
          <span className="text-xs text-white/50 block truncate">
            {hasNote ? note : "Hvor serviceres gearet? Tilføj en note"}
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
            className="input min-h-[96px] resize-y"
            placeholder="Fx: Segways serviceres hos … / kontaktperson / interval"
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
