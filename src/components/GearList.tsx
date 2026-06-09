import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Pencil, Power, Trash2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  deleteGear,
  updateGear,
  setGearCategory,
  renameGearCategory,
  deleteGearCategory,
  type Gear,
  type GearCategory,
} from "@/lib/gearApi";
import { resolveColorCode } from "@/lib/activityIcons";
import GearEditForm from "./GearEditForm";
import GearBoxesGrid from "./GearBoxesGrid";

// Sentinel for gear uden kategori ("Ukategoriseret"-droppable)
const UNCATEGORIZED = "__uncategorized__";

function isSetLike(g: Gear): boolean {
  const name = (g.name || "").toLowerCase();
  const type = (g.geartype?.name || "").toLowerCase();
  return (
    name.includes("sæt") ||
    name.includes("saet") ||
    name.includes("set") ||
    type.includes("teamlazer") ||
    name.includes("teamlazer")
  );
}

export default function GearList({
  items,
  onUpdated,
  categories,
}: {
  items: Gear[];
  onUpdated?: () => void;
  categories?: GearCategory[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Lokal kopi så drag kan opdatere UI'et med det samme (optimistisk),
  // før parent har genindlæst fra databasen.
  const [localItems, setLocalItems] = useState<Gear[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => setLocalItems(items), [items]);

  const sensors = useSensors(
    // Mus: drag starter først efter 8px, så et klik stadig åbner detaljen
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch: hold kort nede for at trække; et hurtigt tap åbner detaljen
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  // Kategori-visning (sektioner + drag) bruges kun når aktiviteten HAR kategorier.
  // Ellers vises det flade gitter som hidtil.
  const useCategories = !!categories && categories.length > 0;

  const groups = useMemo(() => {
    const cats = [...(categories || [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    const inCat = (id: string | null) =>
      localItems.filter((g) => (g.category_id || null) === id);
    const result = cats.map((c) => ({
      key: c.id,
      title: c.name,
      category: c as GearCategory | null,
      items: inCat(c.id),
    }));
    result.push({ key: UNCATEGORIZED, title: "Ukategoriseret", category: null, items: inCat(null) });
    return result;
  }, [categories, localItems]);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await updateGear(id, { out_of_service: !current });
      toast.success(current ? "Aktiveret" : "Markeret ude af drift");
      onUpdated?.();
    } catch {
      toast.error("Kunne ikke opdatere gear");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Slet dette gear?")) return;
    try {
      await deleteGear(id);
      toast.success("Slettet");
      onUpdated?.();
    } catch {
      toast.error("Kunne ikke slette gear");
    }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const gearId = String(e.active.id);
    const overId = String(e.over.id);
    const targetCat = overId === UNCATEGORIZED ? null : overId;
    const current = localItems.find((g) => g.id === gearId);
    if (!current || (current.category_id || null) === targetCat) return;

    // Optimistisk: flyt kortet med det samme
    setLocalItems((prev) =>
      prev.map((g) => (g.id === gearId ? { ...g, category_id: targetCat } : g)),
    );
    try {
      await setGearCategory(gearId, targetCat);
      onUpdated?.();
    } catch {
      toast.error("Kunne ikke flytte gear");
      setLocalItems(items); // rul tilbage
    }
  };

  const handleRenameCategory = async (cat: GearCategory) => {
    const name = window.prompt("Omdøb kategori", cat.name);
    if (!name || !name.trim() || name.trim() === cat.name) return;
    try {
      await renameGearCategory(cat.id, name.trim());
      toast.success("Kategori omdøbt");
      onUpdated?.();
    } catch {
      toast.error("Kunne ikke omdøbe kategori");
    }
  };

  const handleDeleteCategory = async (cat: GearCategory) => {
    if (
      !window.confirm(
        `Slet kategorien "${cat.name}"? Gear i kategorien flyttes til Ukategoriseret.`,
      )
    )
      return;
    try {
      await deleteGearCategory(cat.id);
      toast.success("Kategori slettet");
      onUpdated?.();
    } catch {
      toast.error("Kunne ikke slette kategori");
    }
  };

  const detailItem = localItems.find((x) => x.id === detailId);
  const editingItem = localItems.find((x) => x.id === editingId);
  const activeItem = localItems.find((x) => x.id === activeId);

  if (!useCategories && items.length === 0) {
    return (
      <div className="text-center text-white/40 text-sm py-12">
        Ingen gear i listen.
      </div>
    );
  }

  return (
    <>
      {useCategories ? (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="space-y-5">
            {groups.map((group) => (
              <CategorySection
                key={group.key}
                id={group.key}
                title={group.title}
                count={group.items.length}
                category={group.category}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
              >
                {group.items.length > 0 ? (
                  group.items.map((g) => (
                    <DraggableCard key={g.id} g={g} onOpen={() => setDetailId(g.id)} />
                  ))
                ) : (
                  <div className="col-span-full text-center text-white/30 text-xs py-6">
                    Træk gear hertil
                  </div>
                )}
              </CategorySection>
            ))}
          </div>
          <DragOverlay>
            {activeItem ? <GearCardVisual g={activeItem} dragging /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {localItems.map((g) => (
            <GearCardVisual key={g.id} g={g} onClick={() => setDetailId(g.id)} />
          ))}
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDetailId(null)}
          />
          <div className="relative panel w-full max-w-md mx-4 overflow-hidden p-0">
            <div
              className="h-2 w-full"
              style={{
                background: resolveColorCode(detailItem.color_code) || "#ff6600",
              }}
            />
            <div className="p-5">
              <button
                onClick={() => setDetailId(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>

              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(40,40,40,0.95), rgba(60,60,60,0.95))",
                    boxShadow: `inset 0 0 0 3px ${resolveColorCode(detailItem.color_code) || "#6b7280"}60`,
                  }}
                >
                  {detailItem.image_url ? (
                    <img
                      src={detailItem.image_url}
                      alt={detailItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor:
                          resolveColorCode(detailItem.color_code) || "#6b7280",
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {detailItem.name}
                  </h3>
                  <span
                    className={`chip mt-2 ${detailItem.out_of_service ? "chip-bad" : "chip-ok"}`}
                  >
                    {detailItem.out_of_service ? "Ude af drift" : "I drift"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                <DetailCell label="Type" value={detailItem.geartype?.name || "—"} />
                <DetailCell label="Sted" value={detailItem.location || "—"} />
                {detailItem.color_code && (
                  <div className="rounded-lg p-3 bg-white/5">
                    <div className="input-label">Farve</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{
                          backgroundColor:
                            resolveColorCode(detailItem.color_code) || "transparent",
                        }}
                      />
                      <span className="text-white/80 text-xs">{detailItem.color_code}</span>
                    </div>
                  </div>
                )}
                {detailItem.frequency && (
                  <DetailCell label="Frekvens" value={detailItem.frequency} />
                )}
                {detailItem.serial_numbers && (
                  <div className="rounded-lg p-3 bg-white/5 col-span-2">
                    <div className="input-label">Serienummer</div>
                    <div className="font-mono text-xs text-white/80">
                      {detailItem.serial_numbers}
                    </div>
                  </div>
                )}
                {detailItem.emei_number && (
                  <DetailCell label="EMEI" value={detailItem.emei_number} mono />
                )}
                {detailItem.battery_change_date && (
                  <DetailCell label="Batteriskift" value={detailItem.battery_change_date} />
                )}
                {detailItem.description && (
                  <div className="rounded-lg p-3 bg-white/5 col-span-2">
                    <div className="input-label">Beskrivelse</div>
                    <div className="text-xs text-white/70 whitespace-pre-line">
                      {detailItem.description}
                    </div>
                  </div>
                )}
                {detailItem.out_of_service && detailItem.out_of_service_reason && (
                  <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/30 col-span-2">
                    <div className="input-label text-red-400">Forklaring</div>
                    <div className="text-xs text-red-300">
                      {detailItem.out_of_service_reason}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="primary-btn flex-1"
                  onClick={() => {
                    setDetailId(null);
                    setEditingId(detailItem.id);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Rediger
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    handleToggle(detailItem.id, detailItem.out_of_service);
                    setDetailId(null);
                  }}
                >
                  <Power className="w-3.5 h-3.5" />
                  {detailItem.out_of_service ? "Aktiver" : "Deaktiver"}
                </button>
                <button
                  className="ghost-btn text-red-400 border-red-500/30 hover:bg-red-500/15"
                  onClick={() => {
                    setDetailId(null);
                    handleDelete(detailItem.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setEditingId(null)}
          />
          <div className="relative bg-black w-full h-full overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="page-title text-2xl">Rediger gear</h2>
                <button onClick={() => setEditingId(null)} className="back-btn">
                  Luk
                </button>
              </div>
              <GearEditForm
                item={editingItem}
                onSaved={() => {
                  setEditingId(null);
                  onUpdated?.();
                }}
                onCancel={() => setEditingId(null)}
              />
              {isSetLike(editingItem) && editingItem.activity_slug !== "A3" && (
                <div className="mt-6">
                  <GearBoxesGrid gearId={editingItem.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// En kategori-sektion er en droppable zone. Gear trækkes ind her for at
// sætte deres category_id (eller null for "Ukategoriseret").
function CategorySection({
  id,
  title,
  count,
  category,
  onRename,
  onDelete,
  children,
}: {
  id: string;
  title: string;
  count: number;
  category: GearCategory | null;
  onRename: (c: GearCategory) => void;
  onDelete: (c: GearCategory) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition-colors ${
        isOver
          ? "border-teamb-orange/60 bg-teamb-orange/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-baseline gap-2">
          <span className="tile-label text-white">{title}</span>
          <span className="text-[10px] text-white/40">({count})</span>
        </div>
        {category && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRename(category)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              title="Omdøb kategori"
            >
              <Pencil className="w-3.5 h-3.5 text-white/60" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="p-1.5 rounded-lg hover:bg-red-500/15"
              title="Slet kategori"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 min-h-[60px]">
        {children}
      </div>
    </div>
  );
}

// Draggable wrapper omkring et gear-kort. Selve kortet er stadig klikbart
// (tap åbner detaljen); drag aktiveres først ved bevægelse/hold.
function DraggableCard({ g, onOpen }: { g: Gear; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: g.id,
  });
  const style: React.CSSProperties = {
    touchAction: "none",
    opacity: isDragging ? 0.4 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GearCardVisual g={g} onClick={onOpen} />
    </div>
  );
}

// Det visuelle gear-kort (rundt ikon + navn + status). Genbruges i fladt
// gitter, i kategori-sektioner og som DragOverlay-preview.
function GearCardVisual({
  g,
  onClick,
  dragging,
}: {
  g: Gear;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const colorHex = resolveColorCode(g.color_code) || "#6b7280";
  const isOos = g.out_of_service;
  const loc = (g.location || "").toLowerCase();
  const isEast = /^(øst|ost)$/i.test(loc);
  const isWest = /^vest$/i.test(loc);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 group cursor-pointer w-full ${
        isOos ? "opacity-50" : ""
      } ${dragging ? "scale-105" : ""}`}
    >
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-110"
          style={{
            background:
              "linear-gradient(145deg, rgba(40,40,40,0.95), rgba(60,60,60,0.95))",
            boxShadow: `inset 0 0 0 3px ${colorHex}60, 0 0 0 1px ${colorHex}30`,
          }}
        >
          {g.image_url ? (
            <img src={g.image_url} alt={g.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorHex }} />
          )}
        </div>
        {(isEast || isWest) && (
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
              isEast
                ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                : "bg-orange-500/30 text-orange-300 border border-orange-500/40"
            }`}
          >
            {isEast ? "ØST" : "VEST"}
          </span>
        )}
      </div>
      <div className="text-center max-w-[100px]">
        <div className="text-[11px] font-semibold text-white/90 leading-tight truncate">
          {g.name}
        </div>
        {g.geartype?.name && (
          <div className="text-[8px] uppercase tracking-wider text-white/45 truncate mt-0.5">
            {g.geartype.name}
          </div>
        )}
        <div
          className={`text-[9px] font-bold mt-0.5 ${
            isOos ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {isOos ? "UDE AF DRIFT" : "I DRIFT"}
        </div>
      </div>
    </button>
  );
}

function DetailCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg p-3 bg-white/5">
      <div className="input-label">{label}</div>
      <div
        className={`${mono ? "font-mono text-xs" : "text-sm"} text-white/85 font-medium`}
      >
        {value}
      </div>
    </div>
  );
}
