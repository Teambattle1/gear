import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Map as MapIcon,
  ListChecks,
  Wrench,
  Play,
  FolderOpen,
  ClipboardList,
  Package,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import TeamBoxChecklist from "@/components/teambox/TeamBoxChecklist";
import TeamBoxVideoGrid from "@/components/teambox/TeamBoxVideoGrid";
import TeamBoxDownloads from "@/components/teambox/TeamBoxDownloads";
import TeamBoxGuide from "@/components/teambox/TeamBoxGuide";
import TeamBoxReport from "@/components/teambox/TeamBoxReport";

type View = "hub" | "guide" | "checklist" | "report" | "video" | "downloads" | "troubleshoot";

type Tile =
  | { id: string; title: string; desc: string; color: TileColor; icon: any; kind: "view"; view: View; badge?: string }
  | { id: string; title: string; desc: string; color: TileColor; icon: any; kind: "external"; url: string; badge?: string }
  | { id: string; title: string; desc: string; color: TileColor; icon: any; kind: "route"; to: string; badge?: string }
  | { id: string; title: string; desc: string; color: TileColor; icon: any; kind: "soon"; badge?: string };

type TileColor = "blue" | "green" | "orange" | "yellow" | "red" | "purple";

const TILE_COLORS: Record<TileColor, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "text-blue-400" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", icon: "text-green-400" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "text-orange-400" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: "text-yellow-400" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "text-red-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: "text-purple-400" },
};

const TILES: Tile[] = [
  { id: "guide", title: "GUIDE", desc: "Instruktioner", color: "blue", icon: MapIcon, kind: "view", view: "guide" },
  {
    id: "pakke",
    title: "PAKKELISTER",
    desc: "Packing List",
    color: "green",
    icon: ListChecks,
    kind: "external",
    url: "https://check.eventday.dk/pakkeliste/teambox",
  },
  {
    id: "nulstil",
    title: "NULSTIL BOX",
    desc: "Reset Box",
    color: "orange",
    icon: Wrench,
    kind: "view",
    view: "checklist",
    badge: "new",
  },
  { id: "fejl", title: "FEJL & MANGLER", desc: "Rapporter fejl", color: "yellow", icon: Wrench, kind: "view", view: "report" },
  { id: "video", title: "VIDEO", desc: "Video Guides", color: "red", icon: Play, kind: "view", view: "video", badge: "new" },
  {
    id: "filer",
    title: "FILER",
    desc: "Upload & Download",
    color: "purple",
    icon: FolderOpen,
    kind: "view",
    view: "downloads",
  },
  {
    id: "fejlsog",
    title: "FEJLSØGNING",
    desc: "Troubleshooting",
    color: "orange",
    icon: Wrench,
    kind: "view",
    view: "troubleshoot",
    badge: "new",
  },
  { id: "score", title: "SCORECARD", desc: "Kommer snart", color: "red", icon: ListChecks, kind: "soon" },
  {
    id: "gear",
    title: "GEAR OVERSIGT",
    desc: "Gear & Udstyr",
    color: "blue",
    icon: ClipboardList,
    kind: "route",
    to: "/aktivitet/A4",
    badge: "new",
  },
];

export default function TeamBox() {
  const nav = useNavigate();
  const [view, setView] = useState<View>("hub");

  useEffect(() => {
    document.title = "TeamBox by TEAMBATTLE";
  }, []);

  if (view === "checklist") return <Shell><TeamBoxChecklist onBack={() => setView("hub")} /></Shell>;
  if (view === "report") return <Shell><TeamBoxReport onBack={() => setView("hub")} /></Shell>;
  if (view === "video") return <Shell><TeamBoxVideoGrid onBack={() => setView("hub")} /></Shell>;
  if (view === "downloads") return <Shell><TeamBoxDownloads onBack={() => setView("hub")} /></Shell>;
  if (view === "guide") return <Shell><TeamBoxGuide onBack={() => setView("hub")} /></Shell>;
  if (view === "troubleshoot") return <Shell><Troubleshoot onBack={() => setView("hub")} /></Shell>;

  return (
    <div className="min-h-screen px-4 pt-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">GEAR</span>
          </button>
        </div>

        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-battle-orange/15 border border-battle-orange/30 mb-4">
            <Package className="w-9 h-9 text-battle-orange" />
          </div>
          <h1 className="text-3xl tablet:text-4xl font-bold tracking-[3px] uppercase">
            <span className="text-white">TEAM</span>
            <span className="text-battle-orange">BOX</span>
          </h1>
          <p className="mt-2 text-xs tracking-[3px] text-white/40 uppercase">Portable Escaperoom Experience</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {TILES.map((tile) => {
            const c = TILE_COLORS[tile.color];
            const Icon = tile.icon;
            const onClick = () => {
              if (tile.kind === "view") setView(tile.view);
              else if (tile.kind === "external") window.open(tile.url, "_blank");
              else if (tile.kind === "route") nav(tile.to);
            };
            const isSoon = tile.kind === "soon";
            return (
              <button
                key={tile.id}
                onClick={onClick}
                disabled={isSoon}
                className={`relative flex flex-col items-start gap-3 p-4 tablet:p-5 rounded-2xl border ${c.border} ${c.bg} text-left transition-all hover:bg-white/5 hover:-translate-y-0.5 ${
                  isSoon ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {tile.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-battle-orange text-white px-1.5 py-0.5 rounded">
                    {tile.badge}
                  </span>
                )}
                <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>
                <div>
                  <h3 className={`text-sm tablet:text-base font-bold uppercase tracking-wider ${c.text}`}>
                    {tile.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    {tile.desc}
                    {tile.kind === "external" && <ExternalLink className="w-3 h-3" />}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen px-4 pt-8 pb-20">{children}</div>;
}

function Troubleshoot({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-lg tablet:text-xl font-bold text-white uppercase tracking-wider">Fejlsøgning</h2>
      </div>
      <div className="bg-battle-grey/20 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-sm">
        <Wrench className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
        <p className="text-gray-400 uppercase tracking-wider text-sm">Fejlsøgning — Kommer snart</p>
      </div>
    </div>
  );
}
