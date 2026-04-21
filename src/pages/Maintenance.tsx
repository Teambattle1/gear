import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Wrench, AlertTriangle, CheckCircle, Printer } from "lucide-react";
import {
  createGearIssue,
  listActivities,
  listAllGear,
  listEmployees,
  listGearIssues,
  updateGear,
  updateGearIssue,
  type Activity,
  type Gear,
  type GearIssue,
} from "@/lib/gearApi";

type Employee = { id: string; navn: string };

export default function Maintenance() {
  const nav = useNavigate();
  const [items, setItems] = useState<Gear[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [crew, setCrew] = useState<Employee[]>([]);
  const [issuesByGear, setIssuesByGear] = useState<Record<string, GearIssue[]>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [g, a, e] = await Promise.all([
        listAllGear(),
        listActivities(),
        listEmployees(),
      ]);
      setItems(g);
      setActivities(a);
      setCrew(e);

      const oos = g.filter((x) => x.out_of_service);
      const issueMap: Record<string, GearIssue[]> = {};
      for (const og of oos) {
        const issues = await listGearIssues(og.id);
        issueMap[og.id] = issues.filter((i) => i.status !== "resolved");
      }
      setIssuesByGear(issueMap);

      const coll: Record<string, boolean> = {};
      for (const og of oos) coll[og.activity_slug || "ukendt"] = true;
      setCollapsed(coll);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "GEAR · Vedligeholdelse";
    load();
  }, []);

  const oosItems = items.filter((g) => g.out_of_service);
  const activeCount = items.length - oosItems.length;

  const handleAssign = async (gearId: string, employeeId: string) => {
    try {
      const existing = issuesByGear[gearId]?.[0];
      let row: GearIssue;
      if (existing?.id) {
        row = await updateGearIssue(existing.id, {
          assigned_to: employeeId,
          status: "assigned",
        });
      } else {
        row = await createGearIssue({
          gear_id: gearId,
          title: "Reparation",
          description: "Automatisk opgave for ude-af-drift gear",
          assigned_to: employeeId,
          priority: "medium",
          status: "assigned",
        });
      }
      toast.success("Tildelt crew");
      setIssuesByGear((m) => ({ ...m, [gearId]: [row] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke tildele crew");
    }
  };

  const handleMarkFixed = async (g: Gear) => {
    try {
      await updateGear(g.id, {
        out_of_service: false,
        out_of_service_reason: null,
      });
      const existing = issuesByGear[g.id]?.[0];
      if (existing?.id) {
        await updateGearIssue(existing.id, {
          status: "resolved",
          resolved_by: existing.resolved_by || existing.assigned_to || null,
          resolved_at: new Date().toISOString(),
        });
      }
      toast.success("Markeret som fixet");
      setItems((arr) => arr.map((x) => (x.id === g.id ? { ...x, out_of_service: false } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke markere som fixet");
    }
  };

  const handlePrint = () => {
    const dateStr = new Date().toLocaleString("da-DK");
    const grouped: Record<string, Gear[]> = {};
    for (const g of oosItems) {
      const key = g.activity_slug || "Ukendt";
      (grouped[key] ||= []).push(g);
    }

    const sections = Object.keys(grouped)
      .sort()
      .map((slug) => {
        const act = activities.find((a) => a.slug === slug || a.id === slug);
        const title = act?.name || slug;
        const rows = grouped[slug]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((g) => {
            const issue = issuesByGear[g.id]?.[0];
            const assignedName =
              crew.find((c) => c.id === issue?.assigned_to)?.navn || "-";
            return `<tr>
              <td>${g.name}</td>
              <td>${g.geartype?.name || "-"}</td>
              <td>${g.out_of_service_reason || "-"}</td>
              <td>${assignedName}</td>
            </tr>`;
          })
          .join("");
        return `<section>
          <h2>${title}</h2>
          <table>
            <thead><tr><th>Enhed</th><th>Type</th><th>Forklaring</th><th>Tildelt</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Ude af drift rapport</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
        h1 { margin: 0 0 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
        h2 { margin: 18px 0 6px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head><body>
      <h1>Ude af drift rapport</h1>
      <div class="meta">Udskrevet: ${dateStr} &middot; Antal: ${oosItems.length}</div>
      ${sections}
      </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  const grouped: Record<string, Gear[]> = {};
  for (const g of oosItems) {
    const key = g.activity_slug || "Ukendt";
    (grouped[key] ||= []).push(g);
  }
  const groupKeys = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/")} className="back-btn">
              <ArrowLeft className="w-4 h-4" />
              Tilbage
            </button>
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-400" />
              <h1 className="page-title text-2xl">Vedligeholdelse</h1>
            </div>
          </div>
          <button onClick={handlePrint} className="ghost-btn">
            <Printer className="w-4 h-4" />
            Print rapport
          </button>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total gear" value={items.length} tone="neutral" />
          <StatCard label="I drift" value={activeCount} tone="ok" />
          <StatCard label="Ude af drift" value={oosItems.length} tone="bad" />
        </div>

        <div className="panel p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="tile-label">Ude af drift ({oosItems.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-white/50 text-sm">Henter…</div>
          ) : oosItems.length === 0 ? (
            <div className="p-10 text-center text-white/50 text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              Alt gear er i drift
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {groupKeys.map((slug) => {
                const list = grouped[slug].sort((a, b) => a.name.localeCompare(b.name));
                const act = activities.find((a) => a.slug === slug || a.id === slug);
                const title = act?.name || slug;
                const isCollapsed = collapsed[slug] ?? true;

                return (
                  <div key={slug}>
                    <button
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [slug]: !isCollapsed }))
                      }
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5"
                    >
                      <span className="font-bold tracking-wider uppercase text-sm">
                        {title}
                      </span>
                      <span className="chip bg-white/10 text-white/80 border border-white/15">
                        {list.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="px-5 pb-4 space-y-3">
                        {list.map((g) => {
                          const issue = issuesByGear[g.id]?.[0];
                          return (
                            <div
                              key={g.id}
                              className="rounded-xl p-4 bg-white/5 border border-white/10"
                            >
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                  <div className="font-semibold text-white">{g.name}</div>
                                  <div className="text-xs text-white/50 mt-0.5">
                                    {g.geartype?.name || "—"} · {g.location || "—"}
                                  </div>
                                  {g.out_of_service_reason && (
                                    <div className="mt-2 text-sm text-red-300">
                                      Forklaring: {g.out_of_service_reason}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <select
                                    value={issue?.assigned_to || ""}
                                    onChange={(e) => handleAssign(g.id, e.target.value)}
                                    className="input w-48"
                                  >
                                    <option value="">Repareres af…</option>
                                    {crew.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.navn}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="primary-btn"
                                    onClick={() => handleMarkFixed(g)}
                                  >
                                    Marker fixet
                                  </button>
                                </div>
                              </div>
                              {issue && (
                                <div className="mt-2 text-[10px] uppercase tracking-widest text-white/40">
                                  Status: {issue.status}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-400 border-emerald-500/30"
      : tone === "bad"
        ? "text-red-400 border-red-500/30"
        : "text-white border-white/15";
  return (
    <div className={`panel text-center border ${color}`}>
      <div className="text-4xl font-bold">{value}</div>
      <div className="input-label mt-1 mb-0">{label}</div>
    </div>
  );
}
