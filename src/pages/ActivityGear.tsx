import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  getGearByActivity,
  listActivities,
  type Activity,
  type Gear,
} from "@/lib/gearApi";
import GearList from "@/components/GearList";
import GearCreationModal from "@/components/GearCreationModal";
import TeamLazerSets from "@/components/TeamLazerSets";
import PackingLinks from "@/components/PackingLinks";

export default function ActivityGear() {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState<Gear[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"name" | "location">("name");

  useEffect(() => {
    listActivities().then(setActivities);
  }, []);

  const activity = useMemo(
    () => activities.find((a) => a.slug === slug || a.id === slug),
    [activities, slug],
  );

  const activityTitle = activity?.name || slug;
  const activityColor = activity?.color || "#ff6600";
  const activityId = activity?.id || slug;

  useEffect(() => {
    document.title = `GEAR · ${activityTitle}`;
  }, [activityTitle]);

  const load = async () => {
    if (!slug) return;
    setItems(await getGearByActivity(slug));
  };

  useEffect(() => {
    load();
  }, [slug]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortMode === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      copy.sort((a, b) => {
        const la = (a.location || "").toLowerCase();
        const lb = (b.location || "").toLowerCase();
        if (la !== lb) return la.localeCompare(lb);
        return a.name.localeCompare(b.name);
      });
    }
    return copy;
  }, [items, sortMode]);

  const showSets = activityId === "A1" || activityId === "A2";

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/")} className="back-btn">
              <ArrowLeft className="w-4 h-4" />
              Tilbage
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-widest uppercase">
                Gear &middot;{" "}
                <span style={{ color: activityColor }}>{activityTitle}</span>
              </h1>
              <p className="text-xs text-white/40 tracking-wider mt-1">
                {items.length} enheder
              </p>
            </div>
          </div>
          <button onClick={() => setModalOpen(true)} className="primary-btn">
            <Plus className="w-4 h-4" />
            Opret gear
          </button>
        </header>

        <PackingLinks activityId={activityId} activityName={activityTitle} />

        {showSets && (
          <TeamLazerSets
            activityId={activityId}
            activitySlug={slug}
            activityTitle={activityTitle}
            onChanged={load}
          />
        )}

        <div className="panel">
          <div className="flex items-center justify-between mb-4 gap-3">
            <button
              onClick={() => setListCollapsed((v) => !v)}
              className="flex-1 flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
            >
              <span className="tile-label text-white">
                Liste over gear ({items.length})
              </span>
              {listCollapsed ? (
                <ChevronRight className="w-5 h-5 text-white/50" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/50" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <label className="input-label mb-0">Sorter</label>
              <select
                className="input w-40"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as "name" | "location")}
              >
                <option value="name">Navn A–Å</option>
                <option value="location">Øst / Vest</option>
              </select>
            </div>
          </div>
          {!listCollapsed && <GearList items={sortedItems} onUpdated={load} />}
        </div>
      </div>

      <GearCreationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activitySlug={slug}
        onCreated={load}
      />
    </div>
  );
}
