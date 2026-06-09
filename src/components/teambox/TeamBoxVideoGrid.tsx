import React from "react";
import { Play, ArrowLeft } from "lucide-react";
import { TEAMBOX_VIDEOS } from "@/lib/teamboxContent";

interface TeamBoxVideoGridProps {
  onBack?: () => void;
}

const TeamBoxVideoGrid: React.FC<TeamBoxVideoGridProps> = ({ onBack }) => {
  return (
    <div className="min-h-[80vh] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-3 pb-2 tablet-landscape:pt-2 tablet-landscape:pb-1">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Play className="w-6 h-6 text-battle-orange" />
            <h1 className="text-lg tablet-landscape:text-xl font-bold text-white uppercase tracking-wider">
              TeamBox Video Guides
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 tablet-landscape:pb-2">
        <div className="max-w-7xl mx-auto grid grid-cols-2 tablet-landscape:grid-cols-3 desktop:grid-cols-3 gap-2 tablet-landscape:gap-3">
          {TEAMBOX_VIDEOS.map((video) => (
            <div
              key={video.id}
              className="bg-battle-grey rounded-lg overflow-hidden border border-white/10 hover:border-battle-orange/50 transition-colors flex flex-col"
            >
              <div className="px-2 py-1 border-b border-white/10 flex-shrink-0">
                <h3 className="text-white font-medium text-xs tablet-landscape:text-sm uppercase tracking-wider text-center">
                  {video.title}
                </h3>
              </div>
              <div className="relative aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamBoxVideoGrid;
