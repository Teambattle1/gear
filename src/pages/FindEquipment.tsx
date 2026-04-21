import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, ExternalLink, Search } from "lucide-react";
import { listAllGear, type Gear } from "@/lib/gearApi";

export default function FindEquipment() {
  const nav = useNavigate();
  const [gear, setGear] = useState<Gear[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [manualImei, setManualImei] = useState("");

  useEffect(() => {
    document.title = "GEAR · Find udstyr";
    listAllGear().then(setGear);
  }, []);

  const openByImei = async (row: Gear | null, manual?: string) => {
    const imei = (manual || row?.emei_number || "").replace(/\D/g, "");
    if (!imei) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(imei);
      }
    } catch {
      // ignore
    }
    window.open("https://app.livegps.dk", "_blank", "noopener,noreferrer");
  };

  const withImei = gear.filter((g) => g.emei_number);

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-3">
          <button onClick={() => nav("/")} className="back-btn">
            <ArrowLeft className="w-4 h-4" />
            Tilbage
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teamb-orange" />
            <h1 className="page-title text-2xl">Find udstyr &middot; GPS</h1>
          </div>
        </header>

        <div className="panel space-y-5">
          <div>
            <label className="input-label">Vælg udstyr med EMEI</label>
            <p className="text-xs text-white/50 mb-2">
              EMEI kopieres til udklipsholder og LiveGPS åbner i nyt vindue.
            </p>
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedId(id);
                const row = gear.find((g) => g.id === id);
                openByImei(row || null);
              }}
              className="input"
            >
              <option value="">— Vælg udstyr —</option>
              {withImei.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} &middot; IMEI {g.emei_number}
                </option>
              ))}
            </select>
            {withImei.length === 0 && (
              <p className="text-xs text-white/40 mt-2">
                Intet gear har EMEI-nummer registreret endnu.
              </p>
            )}
          </div>

          <div className="border-t border-white/10 pt-5">
            <label className="input-label">Eller indtast EMEI manuelt</label>
            <div className="flex gap-2">
              <input
                value={manualImei}
                onChange={(e) => setManualImei(e.target.value)}
                placeholder="15-cifret IMEI"
                className="input flex-1"
              />
              <button
                onClick={() => openByImei(null, manualImei)}
                disabled={!manualImei.trim()}
                className="primary-btn whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                Åbn LiveGPS
              </button>
            </div>
          </div>

          <a
            href="https://app.livegps.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-white/50 hover:text-teamb-orange"
          >
            Åbn LiveGPS direkte <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
