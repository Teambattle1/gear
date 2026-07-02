import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, ChevronDown, ChevronRight, FolderPlus, Tag } from "lucide-react";
import {
  getGearByActivity,
  listActivities,
  listGearCategories,
  createGearCategory,
  createGeartype,
  isSetGear,
  type Activity,
  type Gear,
  type GearCategory,
} from "@/lib/gearApi";
import GearList from "@/components/GearList";
import GearCreationModal from "@/components/GearCreationModal";
import TeamLazerSets from "@/components/TeamLazerSets";
import TeamLazerFrequencyOverview from "@/components/TeamLazerFrequencyOverview";
import TabletsList from "@/components/TabletsList";
import PackingLinks from "@/components/PackingLinks";
import ServiceNote from "@/components/ServiceNote";
import ShoppingNote from "@/components/ShoppingNote";

const COLOR_ORDER = ["blå", "grøn", "lilla", "orange", "pink", "rød", "sort"];

const HEX_TO_COLOR_IDX: Record<string, number> = {
  "#0d39e7": 0,
  "#0ea5e9": 0,
  "#3b82f6": 0,
  "#37a022": 1,
  "#10b981": 1,
  "#22c55e": 1,
  "#7c3aed": 2,
  "#a855f7": 2,
  "#f56e00": 3,
  "#fb923c": 3,
  "#ff6600": 3,
  "#f609c3": 4,
  "#ff49a1": 4,
  "#ec4899": 4,
  "#f50000": 5,
  "#ff3b30": 5,
  "#ef4444": 5,
  "#000000": 6,
  "#111827": 6,
};

function colorRank(item: Gear): number {
  const combined = `${item.name || ""} ${item.color_code || ""}`.toLowerCase();
  for (let i = 0; i < COLOR_ORDER.length; i++) {
    if (combined.includes(COLOR_ORDER[i])) return i;
  }
  const hex = (item.color_code || "").toLowerCase().trim();
  if (HEX_TO_COLOR_IDX[hex] !== undefined) return HEX_TO_COLOR_IDX[hex];
  return 99;
}

export default function ActivityGear() {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [items, setItems] = useState<Gear[]>([]);
  const [categories, setCategories] = useState<GearCategory[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"color" | "name" | "location">("color");

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
    const [gear, cats] = await Promise.all([
      getGearByActivity(slug),
      listGearCategories(slug),
    ]);
    setItems(gear);
    setCategories(cats);
  };

  useEffect(() => {
    load();
  }, [slug]);

  const handleNewCategory = async () => {
    const name = window.prompt("Navn på ny kategori");
    if (!name || !name.trim()) return;
    try {
      await createGearCategory(slug, name.trim());
      toast.success("Kategori oprettet");
      load();
    } catch {
      toast.error("Kunne ikke oprette kategori");
    }
  };

  const handleNewType = async () => {
    const name = window.prompt("Navn på ny type");
    if (!name || !name.trim()) return;
    try {
      await createGeartype({ name: name.trim() });
      toast.success(`Type "${name.trim()}" oprettet — vælg den under Rediger gear`);
    } catch {
      toast.error("Kunne ikke oprette type");
    }
  };

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortMode === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "location") {
      copy.sort((a, b) => {
        const la = (a.location || "").toLowerCase();
        const lb = (b.location || "").toLowerCase();
        if (la !== lb) return la.localeCompare(lb);
        return a.name.localeCompare(b.name);
      });
    } else {
      copy.sort((a, b) => {
        const ca = colorRank(a);
        const cb = colorRank(b);
        if (ca !== cb) return ca - cb;
        return a.name.localeCompare(b.name);
      });
    }
    return copy;
  }, [items, sortMode]);

  const showSets = activityId === "A1" || activityId === "A2" || activityId === "A3";
  const showTablets = activityId === "A1" || activityId === "A11";

  // Sæt vises i sæt-panelet (hovedkategori) og redigeres derfra — skjul dem
  // i den almindelige gear-liste på sæt-aktiviteter.
  const listItems = useMemo(
    () => (showSets ? sortedItems.filter((g) => !isSetGear(g, activityId)) : sortedItems),
    [sortedItems, showSets, activityId],
  );

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

        <ServiceNote activitySlug={slug} />

        <ShoppingNote activitySlug={slug} />

        <PackingLinks activityId={activityId} activityName={activityTitle} />

        {showSets && (
          <TeamLazerSets
            activityId={activityId}
            activitySlug={slug}
            activityTitle={activityTitle}
            onChanged={load}
          />
        )}

        {showTablets && <TabletsList />}

        {/* TeamLazer: samme frekvens-oversigt som på crew.eventday.dk (samme delte gear-tabel) */}
        {activityId === "A2" && <TeamLazerFrequencyOverview items={listItems} />}

        <div className="panel">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <button
              onClick={() => setListCollapsed((v) => !v)}
              className="flex-1 min-w-[160px] flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
            >
              <span className="tile-label text-white">
                Liste over gear ({listItems.length})
              </span>
              {listCollapsed ? (
                <ChevronRight className="w-5 h-5 text-white/50" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/50" />
              )}
            </button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button onClick={handleNewCategory} className="ghost-btn whitespace-nowrap">
                <FolderPlus className="w-4 h-4 text-white" />
                Ny kategori
              </button>
              <button onClick={handleNewType} className="ghost-btn whitespace-nowrap">
                <Tag className="w-4 h-4 text-white" />
                Ny type
              </button>
              <label className="input-label mb-0">Sorter</label>
              <select
                className="input w-40"
                value={sortMode}
                onChange={(e) =>
                  setSortMode(e.target.value as "color" | "name" | "location")
                }
              >
                <option value="color">Farve</option>
                <option value="name">Navn A–Å</option>
                <option value="location">Øst / Vest</option>
              </select>
            </div>
          </div>
          {!listCollapsed && (
            <GearList items={listItems} onUpdated={load} categories={categories} />
          )}
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
