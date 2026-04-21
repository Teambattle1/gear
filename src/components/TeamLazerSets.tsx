import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  createGear,
  createGeartype,
  getGearByActivity,
  getGeartypes,
  listGearSetAssignments,
  updateGear,
  upsertGearSetAssignment,
  type Gear,
} from "@/lib/gearApi";
import { resolveColorCode } from "@/lib/activityIcons";
import GearBoxesGrid from "./GearBoxesGrid";

type Assignment = {
  id?: string;
  set_gear_id: string;
  role: string;
  assigned_text?: string | null;
  assigned_gear_id?: string | null;
};

export default function TeamLazerSets({
  activityId,
  activitySlug,
  activityTitle,
  onChanged,
}: {
  activityId: string;
  activitySlug: string;
  activityTitle: string;
  onChanged?: () => void;
}) {
  const [gear, setGear] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [teamLazerTypeId, setTeamLazerTypeId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<
    Record<string, Record<string, Assignment>>
  >({});
  const [ensuredInitial, setEnsuredInitial] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [collapseInitialized, setCollapseInitialized] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setGear(await getGearByActivity(activitySlug));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activitySlug]);

  useEffect(() => {
    (async () => {
      const types = await getGeartypes();
      let found = types.find((t) => t.name.toLowerCase() === "teamlazer");
      if (!found) {
        try {
          found = await createGeartype({ name: "TeamLazer" });
        } catch {
          found = undefined;
        }
      }
      setTeamLazerTypeId(found?.id || null);
    })();
  }, []);

  const sets = useMemo(() => {
    return gear.filter((g) => {
      const name = g.name.toLowerCase();
      const type = (g.geartype?.name || "").toLowerCase();
      return (
        name.includes("sæt") ||
        name.includes("saet") ||
        name.includes("set") ||
        type.includes("teamlazer") ||
        name.includes("teamlazer")
      );
    });
  }, [gear]);

  useEffect(() => {
    if (!teamLazerTypeId || ensuredInitial) return;
    if (activityId === "A2") {
      setEnsuredInitial(true);
      return;
    }
    if (sets.length > 0) {
      setEnsuredInitial(true);
      return;
    }
    (async () => {
      for (let i = 1; i <= 6; i++) {
        await createGear({
          name: `SÆT ${i}`,
          activity_slug: activitySlug,
          geartype_id: teamLazerTypeId,
          color_code: null,
        });
      }
      await load();
      onChanged?.();
      setEnsuredInitial(true);
    })();
  }, [teamLazerTypeId, sets.length, ensuredInitial, activityId, activitySlug]);

  useEffect(() => {
    (async () => {
      const acc: Record<string, Record<string, Assignment>> = {};
      for (const s of sets) {
        try {
          const rows = (await listGearSetAssignments(s.id)) as Assignment[];
          acc[s.id] = {};
          for (const r of rows) acc[s.id][r.role] = r;
        } catch {
          acc[s.id] = {};
        }
      }
      setAssignments(acc);
    })();
  }, [sets.length]);

  useEffect(() => {
    if (collapseInitialized || sets.length === 0) return;
    const init: Record<string, boolean> = {};
    for (const s of sets) init[s.id] = true;
    setCollapsed(init);
    setCollapseInitialized(true);
  }, [sets, collapseInitialized]);

  const nextSetIndex = useMemo(() => {
    const nums = sets
      .map((s) => {
        const m = s.name.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }, [sets]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamLazerTypeId) return;
    setCreating(true);
    try {
      const name = newName.trim() || `SÆT ${nextSetIndex}`;
      await createGear({
        name,
        activity_slug: activitySlug,
        geartype_id: teamLazerTypeId,
        color_code: newColor || null,
      });
      setNewName("");
      setNewColor("");
      await load();
      onChanged?.();
    } finally {
      setCreating(false);
    }
  };

  const rolesForSet = (setId: string) => {
    if (activityId === "A1") {
      return Object.keys(assignments[setId] || {}).filter(
        (r) => !["display", "kaster"].includes(r) && !r.startsWith("gevær"),
      );
    }
    if (activityId === "A2") {
      const base = [
        "display",
        "kaster",
        "gevær 1",
        "gevær 2",
        "gevær 3",
        "gevær 4",
        "gevær 5",
      ];
      const extra = Object.keys(assignments[setId] || {}).filter(
        (r) => !base.includes(r) && r !== "gevær",
      );
      return [...base, ...extra];
    }
    const base = ["display", "kaster", "gevær"];
    const extra = Object.keys(assignments[setId] || {}).filter((r) => !base.includes(r));
    return [...base, ...extra];
  };

  const saveAssignedGear = async (
    setId: string,
    role: string,
    gearId: string | null,
    gearName: string | null,
  ) => {
    try {
      const row = await upsertGearSetAssignment({
        set_gear_id: setId,
        role,
        assigned_gear_id: gearId,
        assigned_text: gearName,
      });
      setAssignments((s) => ({
        ...s,
        [setId]: { ...(s[setId] || {}), [role]: row as Assignment },
      }));
    } catch {
      // ignore
    }
  };

  const gearForRole = (role: string): Gear[] => {
    // Strip trailing slot number ("gevær 3" -> "gevær") before matching geartype
    const baseRole = role.toLowerCase().replace(/\s+\d+$/, "").trim();
    return gear.filter((g) => {
      if (sets.some((s) => s.id === g.id)) return false;
      const type = (g.geartype?.name || "").toLowerCase();
      if (!type) return false;
      if (type === "sæt" || type === "saet" || type === "teamlazer") return false;
      return type.includes(baseRole) || baseRole.includes(type);
    });
  };

  const updateSet = async (setId: string, updates: Partial<Gear>) => {
    try {
      await updateGear(setId, updates);
      setGear((arr) => arr.map((g) => (g.id === setId ? { ...g, ...updates } : g)));
      onChanged?.();
    } catch {
      load();
    }
  };

  if (!teamLazerTypeId) return null;

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="tile-label text-white">
          {activityTitle}: Sæt ({sets.length})
        </h2>
        <form onSubmit={handleCreate} className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="input-label">Navn</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`SÆT ${nextSetIndex}`}
              className="input w-40"
            />
          </div>
          <div>
            <label className="input-label">Farve</label>
            <input
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="#0ea5e9 eller blå"
              className="input w-40"
            />
          </div>
          <button type="submit" disabled={creating} className="primary-btn">
            {creating ? "Opretter…" : "Opret sæt"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-sm text-white/40">Henter…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sets.map((s) => {
            const isCollapsed = collapsed[s.id] ?? true;
            const setColor = resolveColorCode(s.color_code) || "#6b7280";
            const displayAssignment = assignments[s.id]?.display;
            const displayGear = displayAssignment?.assigned_gear_id
              ? gear.find((g) => g.id === displayAssignment.assigned_gear_id)
              : null;
            const displayEmei = displayGear?.emei_number || null;

            return (
              <div
                key={s.id}
                className="rounded-2xl bg-black/60 overflow-hidden transition-all"
                style={{
                  border: `2px solid ${setColor}`,
                  boxShadow: isCollapsed
                    ? `0 0 0 1px ${setColor}30`
                    : `0 0 24px ${setColor}35, 0 0 0 1px ${setColor}50`,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [s.id]: !isCollapsed }))
                  }
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-block w-5 h-5 rounded-full shrink-0 border-2 border-white/30"
                      style={{ backgroundColor: setColor }}
                    />
                    <span className="font-bold tracking-wider uppercase text-white truncate">
                      {s.name}
                    </span>
                    {activityId === "A2" && (s.frequency || s.system_id) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {s.frequency && (
                          <span
                            className="chip"
                            style={{
                              background: `${setColor}20`,
                              color: setColor,
                              border: `1px solid ${setColor}50`,
                            }}
                          >
                            Freq {s.frequency}
                          </span>
                        )}
                        {s.system_id && (
                          <span
                            className="chip font-mono"
                            style={{
                              background: `${setColor}20`,
                              color: setColor,
                              border: `1px solid ${setColor}50`,
                            }}
                          >
                            #{s.system_id}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/50 shrink-0" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="p-4 pt-0 space-y-3 border-t border-white/5">
                    <div>
                      <label className="input-label">Navn</label>
                      <input
                        className="input"
                        value={s.name}
                        onChange={(e) =>
                          setGear((curr) =>
                            curr.map((g) =>
                              g.id === s.id ? { ...g, name: e.target.value } : g,
                            ),
                          )
                        }
                        onBlur={(e) => updateSet(s.id, { name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Farve</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="w-10 h-10 rounded cursor-pointer border border-white/20 bg-transparent"
                            value={setColor}
                            onChange={(e) =>
                              updateSet(s.id, { color_code: e.target.value })
                            }
                          />
                          <input
                            className="input flex-1"
                            value={s.color_code || ""}
                            onChange={(e) =>
                              setGear((curr) =>
                                curr.map((g) =>
                                  g.id === s.id
                                    ? { ...g, color_code: e.target.value }
                                    : g,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              updateSet(s.id, { color_code: e.target.value })
                            }
                            placeholder="Farvenavn eller hex"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Sted</label>
                        <select
                          className="input"
                          value={s.location || ""}
                          onChange={(e) =>
                            updateSet(s.id, { location: e.target.value || null })
                          }
                        >
                          <option value="">— Vælg sted —</option>
                          <option value="Øst">Øst</option>
                          <option value="Vest">Vest</option>
                        </select>
                      </div>
                    </div>

                    {activityId === "A2" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="input-label">Frekvens</label>
                          <select
                            className="input"
                            value={s.frequency || ""}
                            onChange={(e) =>
                              updateSet(s.id, {
                                frequency: e.target.value || null,
                              })
                            }
                          >
                            <option value="">— Vælg frekvens —</option>
                            <option value="1">Frekvens 1</option>
                            <option value="2">Frekvens 2</option>
                            <option value="3">Frekvens 3</option>
                          </select>
                        </div>
                        <div>
                          <label className="input-label">System ID</label>
                          <input
                            className="input font-mono"
                            value={s.system_id || ""}
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]{4}"
                            placeholder="4 cifre"
                            onChange={(e) => {
                              const digits = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4);
                              setGear((curr) =>
                                curr.map((g) =>
                                  g.id === s.id ? { ...g, system_id: digits } : g,
                                ),
                              );
                            }}
                            onBlur={(e) => {
                              const digits = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4);
                              updateSet(s.id, { system_id: digits || null });
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rolesForSet(s.id).map((role) => {
                        const options = gearForRole(role);
                        const currentId =
                          assignments[s.id]?.[role]?.assigned_gear_id || "";
                        const currentText =
                          assignments[s.id]?.[role]?.assigned_text || "";
                        return (
                          <div key={role} className="flex flex-col">
                            <label className="input-label capitalize">{role}</label>
                            <select
                              className="input"
                              value={currentId}
                              onChange={(e) => {
                                const gearId = e.target.value || null;
                                const gearName =
                                  gear.find((g) => g.id === gearId)?.name || null;
                                setAssignments((st) => ({
                                  ...st,
                                  [s.id]: {
                                    ...(st[s.id] || {}),
                                    [role]: {
                                      ...(st[s.id]?.[role] || {}),
                                      assigned_gear_id: gearId,
                                      assigned_text: gearName,
                                      role,
                                      set_gear_id: s.id,
                                    },
                                  },
                                }));
                                saveAssignedGear(s.id, role, gearId, gearName);
                              }}
                            >
                              <option value="">— Vælg {role} —</option>
                              {options.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                  {g.out_of_service ? " (ude af drift)" : ""}
                                </option>
                              ))}
                            </select>
                            {currentId &&
                              !options.some((o) => o.id === currentId) && (
                                <div className="text-[10px] text-amber-400 mt-1 tracking-wider uppercase">
                                  Tidl.: {currentText} (passer ikke til filter)
                                </div>
                              )}
                            {options.length === 0 && (
                              <div className="text-[10px] text-white/40 mt-1 tracking-wider uppercase">
                                Ingen gear med type "{role}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {displayEmei && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (navigator.clipboard?.writeText) {
                              await navigator.clipboard.writeText(displayEmei);
                              toast.success(
                                `EMEI ${displayEmei} kopieret — LiveGPS åbnet`,
                              );
                            }
                          } catch {
                            /* ignore */
                          }
                          window.open(
                            "https://app.livegps.dk",
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all font-bold tracking-wider uppercase text-xs"
                        style={{
                          color: setColor,
                          background: `${setColor}15`,
                          borderColor: `${setColor}60`,
                        }}
                      >
                        <MapPin className="w-4 h-4" />
                        Vis på kort (EMEI {displayEmei})
                      </button>
                    )}

                    {activityId !== "A2" && (
                      <div className="pt-2">
                        <GearBoxesGrid gearId={s.id} defaultOpen={false} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
