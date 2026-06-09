import React, { useState } from "react";
import {
  Target,
  Users,
  Music,
  Clock,
  ClipboardList,
  MapPin,
  Trophy,
  Home,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ExternalLink,
} from "lucide-react";
import { GUIDE_SECTIONS, type GuideColor } from "@/lib/teamboxContent";

const ICONS: Record<string, React.ElementType> = {
  Target,
  Users,
  Music,
  Clock,
  ClipboardList,
  MapPin,
  Trophy,
  Home,
  HelpCircle,
};

const COLORS: Record<GuideColor, { bg: string; border: string; text: string; icon: string }> = {
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "text-red-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", icon: "text-green-500" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "text-blue-500" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: "text-yellow-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: "text-purple-500" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "text-orange-500" },
};

interface TeamBoxGuideProps {
  onBack: () => void;
}

const TeamBoxGuide: React.FC<TeamBoxGuideProps> = ({ onBack }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 tablet:px-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-lg tablet:text-xl font-bold text-white uppercase tracking-wider">TeamBox Guide</h2>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3 tablet:gap-4">
        {GUIDE_SECTIONS.map((section) => {
          const Icon = ICONS[section.icon] || HelpCircle;
          const c = COLORS[section.color] || COLORS.blue;
          const isExpanded = expanded === section.key;
          return (
            <div
              key={section.key}
              className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden transition-all duration-300 ${
                isExpanded ? "tablet:col-span-3 tablet:row-span-2" : ""
              }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : section.key)}
                className="w-full p-3 tablet:p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.bg} border ${c.border}`}>
                    <Icon className={`w-5 h-5 tablet:w-6 tablet:h-6 ${c.icon}`} />
                  </div>
                  <h3 className={`text-sm tablet:text-base font-bold uppercase tracking-wider ${c.text}`}>
                    {section.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-5 h-5 ${c.text}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${c.text}`} />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 tablet:p-6 border-t border-white/10">
                  <div className="text-sm tablet:text-base text-gray-300 whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>
                  {section.link && (
                    <div className="mt-4">
                      <a
                        href={section.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 ${c.bg} border ${c.border} rounded-lg ${c.text} text-xs uppercase tracking-wider hover:bg-white/10 transition-colors`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {section.linkText || "ÅBEN LINK"}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamBoxGuide;
