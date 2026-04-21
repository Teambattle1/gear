import { Package, ExternalLink } from "lucide-react";
import { buildPackingLinks, buildLibraryLink } from "@/lib/packingLinks";

export default function PackingLinks({
  activityId,
  activityName,
}: {
  activityId: string;
  activityName: string;
}) {
  const links = buildPackingLinks(activityName);

  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-emerald-400" />
        <h2 className="tile-label text-white">Pakkelister</h2>
        <span className="text-[10px] text-white/40 tracking-widest uppercase ml-2">
          via CHECK
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-emerald-200 uppercase tracking-wider">
                {link.label}
              </div>
              <div className="text-[10px] text-white/50 tracking-wide">
                {link.sublabel}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-emerald-400" />
          </a>
        ))}
      </div>

      <a
        href={buildLibraryLink(activityId)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-white/50 hover:text-emerald-400"
      >
        Rediger bibliotek i CHECK <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
