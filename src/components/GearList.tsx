import { useState } from "react";
import { toast } from "sonner";
import { X, Pencil, Power, Trash2 } from "lucide-react";
import { deleteGear, updateGear, type Gear } from "@/lib/gearApi";
import { resolveColorCode } from "@/lib/activityIcons";
import GearEditForm from "./GearEditForm";
import GearBoxesGrid from "./GearBoxesGrid";

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
}: {
  items: Gear[];
  onUpdated?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const detailItem = items.find((x) => x.id === detailId);
  const editingItem = items.find((x) => x.id === editingId);

  if (items.length === 0) {
    return (
      <div className="text-center text-white/40 text-sm py-12">
        Intet gear registreret for denne aktivitet endnu.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {items.map((g) => {
          const colorHex = resolveColorCode(g.color_code) || "#6b7280";
          const isOos = g.out_of_service;
          const loc = (g.location || "").toLowerCase();
          const isEast = /^(øst|ost)$/i.test(loc);
          const isWest = /^vest$/i.test(loc);

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setDetailId(g.id)}
              className={`flex flex-col items-center gap-2 group cursor-pointer ${isOos ? "opacity-50" : ""}`}
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
                    <img
                      src={g.image_url}
                      alt={g.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colorHex }}
                    />
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
        })}
      </div>

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
              {isSetLike(editingItem) && (
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
