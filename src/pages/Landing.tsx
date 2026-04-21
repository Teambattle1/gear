import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wrench, Search, Package } from "lucide-react";
import {
  listActivities,
  listAllGear,
  type Activity,
  type Gear,
} from "@/lib/gearApi";
import { pickIconForActivity, getActivitySubtitle } from "@/lib/activityIcons";

export default function Landing() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gear, setGear] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "GEAR by TEAMBATTLE";
    (async () => {
      const [a, g] = await Promise.all([listActivities(), listAllGear()]);
      setActivities(a);
      setGear(g);
      setLoading(false);
    })();
  }, []);

  const countBySlug = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of gear) {
      if (!g.activity_slug) continue;
      map[g.activity_slug] = (map[g.activity_slug] || 0) + 1;
    }
    return map;
  }, [gear]);

  const oosCount = useMemo(() => gear.filter((g) => g.out_of_service).length, [gear]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-10 pb-20">
      <header className="text-center mb-10">
        <h1 className="page-title">
          <span className="text-white">GEA</span>
          <span className="text-teamb-orange">R</span>
        </h1>
        <div className="mt-2 text-xs tracking-[4px] text-white/40 uppercase">
          by <span className="text-white font-bold">TEAM</span>
          <span className="text-teamb-orange font-bold">BATTLE</span>
        </div>
      </header>

      <main className="w-full max-w-5xl">
        <section className="mb-12">
          <h2 className="text-xs tracking-[3px] uppercase text-white/50 mb-6 text-center">
            Aktiviteter
          </h2>

          {loading ? (
            <div className="text-center text-white/40 text-sm">Henter aktiviteter...</div>
          ) : activities.length === 0 ? (
            <div className="text-center text-white/40 text-sm">
              Ingen aktiviteter fundet. Tjek Supabase-forbindelse.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-8 gap-x-4 justify-items-center">
              {activities.map((a) => {
                const Icon = pickIconForActivity(a.name);
                const count = countBySlug[a.slug] || countBySlug[a.id] || 0;
                const subtitle = getActivitySubtitle(a.name);

                return (
                  <Link
                    key={a.id}
                    to={`/aktivitet/${a.slug}`}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="relative">
                      <div className="glow-tile glow-tile-pulse">
                        <Icon
                          className="w-14 h-14"
                          style={{ color: "#fff" }}
                          strokeWidth={1.8}
                        />
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[26px] h-[26px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold bg-white text-teamb-orange-dark border-2 border-black">
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="tile-label">
                        <span className="text-white/40">TEAM</span>
                        <span className="text-white">
                          {a.name.replace(/^team/i, "").toUpperCase()}
                        </span>
                      </div>
                      {subtitle && <div className="tile-sublabel">{subtitle}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-wrap justify-center gap-4">
          <Link to="/vedligeholdelse" className="ghost-btn" style={{ padding: "14px 22px" }}>
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>
              Vedligeholdelse
              {oosCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {oosCount}
                </span>
              )}
            </span>
          </Link>

          <Link to="/find" className="ghost-btn" style={{ padding: "14px 22px" }}>
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Find udstyr (GPS)</span>
          </Link>

          <a
            href="https://check.eventday.dk/admin/pakkeliste"
            target="_blank"
            rel="noopener noreferrer"
            className="ghost-btn"
            style={{ padding: "14px 22px" }}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Rediger pakkelister i CHECK ↗</span>
          </a>
        </section>
      </main>
    </div>
  );
}
