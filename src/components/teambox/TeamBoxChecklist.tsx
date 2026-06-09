import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle2,
  Circle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  MessageSquare,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CHECKLIST_SECTIONS as SECTIONS } from "@/lib/teamboxContent";

interface SectionNote {
  hasIssue: boolean;
  note: string;
}

interface TeamBoxChecklistProps {
  onBack: () => void;
}

const TeamBoxChecklist: React.FC<TeamBoxChecklistProps> = ({ onBack }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<string>>>({});
  const [sectionNotes, setSectionNotes] = useState<Record<string, SectionNote>>({});
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const storageKey = "teambox_checklist";

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const checked: Record<string, Set<string>> = {};
        Object.keys(parsed.checked || {}).forEach((key) => {
          checked[key] = new Set(parsed.checked[key]);
        });
        setCheckedItems(checked);
        setSectionNotes(parsed.notes || {});
      } catch (e) {
        console.error("Failed to load checklist:", e);
      }
    }
  }, []);

  useEffect(() => {
    const toSave = {
      checked: {} as Record<string, string[]>,
      notes: sectionNotes,
    };
    Object.keys(checkedItems).forEach((key) => {
      toSave.checked[key] = [...checkedItems[key]];
    });
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  }, [checkedItems, sectionNotes]);

  const section = SECTIONS[currentSection];
  const sectionChecked = checkedItems[section.id] || new Set<string>();
  const sectionProgress = (sectionChecked.size / section.items.length) * 100;

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const totalChecked = SECTIONS.reduce((sum, s) => (checkedItems[s.id]?.size || 0) + sum, 0);
  const overallProgress = (totalChecked / totalItems) * 100;

  const hasAnyIssues = Object.values(sectionNotes).some((n) => n.hasIssue && n.note);

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => {
      const sectionSet = new Set(prev[section.id] || []);
      if (sectionSet.has(itemId)) {
        sectionSet.delete(itemId);
      } else {
        sectionSet.add(itemId);
      }
      return { ...prev, [section.id]: sectionSet };
    });
  };

  const checkAllSection = () => {
    setCheckedItems((prev) => ({
      ...prev,
      [section.id]: new Set(section.items.map((i) => i.id)),
    }));
  };

  const resetSection = () => {
    if (confirm("Nulstil alle i denne sektion?")) {
      setCheckedItems((prev) => ({ ...prev, [section.id]: new Set() }));
    }
  };

  const resetAll = () => {
    if (confirm("Nulstil HELE tjeklisten inkl. noter?")) {
      setCheckedItems({});
      setSectionNotes({});
      setCurrentSection(0);
    }
  };

  const saveNote = () => {
    if (currentNote.trim()) {
      setSectionNotes((prev) => ({
        ...prev,
        [section.id]: { hasIssue: true, note: currentNote.trim() },
      }));
    }
    setShowNoteInput(false);
    setCurrentNote("");
  };

  const clearNote = () => {
    setSectionNotes((prev) => {
      const newNotes = { ...prev };
      delete newNotes[section.id];
      return newNotes;
    });
  };

  const goNext = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      setShowReport(true);
    }
  };

  const goPrev = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1);
  };

  const submitReport = async () => {
    setIsSending(true);
    try {
      const issuesReport = Object.entries(sectionNotes)
        .filter(([, note]) => note.hasIssue && note.note)
        .map(([sectionId, note]) => {
          const sectionName = SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
          return `${sectionName}: ${note.note}`;
        })
        .join("\n\n");

      const { error: dbError } = await supabase.from("fejlsogning_reports").insert({
        activity: "teambox",
        activity_name: "TeamBox - Nulstilling",
        date: new Date().toISOString().split("T")[0],
        gear: "EscapeBOX",
        description: issuesReport || "Ingen fejl rapporteret - alt OK",
        reported_by: "gear",
        reported_by_name: "GEAR",
        created_at: new Date().toISOString(),
      });
      if (dbError) console.error("DB Error:", dbError);

      if (hasAnyIssues) {
        const subject = encodeURIComponent("TeamBox Nulstilling - Fejlrapport");
        const body = encodeURIComponent(
          `FEJLRAPPORT - TeamBox Nulstilling\n\nDato: ${new Date().toLocaleDateString(
            "da-DK"
          )}\n\nFUNDNE PROBLEMER:\n${issuesReport}\n\n---\nSendt fra GEAR`
        );
        window.location.href = `mailto:booking@teambattle.dk?subject=${subject}&body=${body}`;
      }
      setSent(true);
    } catch (err) {
      console.error("Error submitting report:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
        <div className="bg-battle-grey/20 border border-green-500/30 rounded-xl tablet:rounded-2xl p-6 tablet:p-8 backdrop-blur-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-400 uppercase tracking-wider mb-2">
            Tjekliste Fuldført!
          </h2>
          <p className="text-gray-400 mb-6">
            {hasAnyIssues
              ? "Fejlrapporten er blevet åbnet i din email-klient."
              : "Ingen fejl rapporteret - boxen er klar til næste bruger."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSent(false);
                setShowReport(false);
                resetAll();
              }}
              className="px-6 py-3 bg-battle-orange/20 border border-battle-orange/30 rounded-lg text-battle-orange uppercase tracking-wider hover:bg-battle-orange/30 transition-colors"
            >
              Start Forfra
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Tilbage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showReport) {
    return (
      <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
        <div className="bg-battle-grey/20 border border-white/10 rounded-xl tablet:rounded-2xl p-4 tablet:p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
              <Package className="w-6 h-6 tablet:w-8 tablet:h-8 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg tablet:text-xl font-bold text-white uppercase tracking-wider">
                Opsummering
              </h2>
              <p className="text-xs tablet:text-sm text-orange-400 uppercase">TeamBox Nulstilling</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-battle-black/30 rounded-xl border border-white/10">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Samlet fremgang</span>
              <span>
                {totalChecked} / {totalItems} ({Math.round(overallProgress)}%)
              </span>
            </div>
            <div className="h-3 bg-battle-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  overallProgress === 100 ? "bg-green-500" : "bg-battle-orange"
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {SECTIONS.map((s, idx) => {
              const sChecked = checkedItems[s.id]?.size || 0;
              const sTotal = s.items.length;
              const sProgress = (sChecked / sTotal) * 100;
              const hasNote = sectionNotes[s.id]?.hasIssue;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentSection(idx);
                    setShowReport(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    sProgress === 100 && !hasNote
                      ? "bg-green-500/20 border border-green-500/30"
                      : hasNote
                      ? "bg-yellow-500/20 border border-yellow-500/30"
                      : "bg-battle-black/30 border border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {sProgress === 100 && !hasNote ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : hasNote ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600" />
                    )}
                    <span
                      className={`font-medium ${
                        sProgress === 100 && !hasNote
                          ? "text-green-400"
                          : hasNote
                          ? "text-yellow-400"
                          : "text-white"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {sChecked}/{sTotal}
                  </span>
                </button>
              );
            })}
          </div>

          {hasAnyIssues && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400 uppercase text-sm">Rapporterede Fejl</span>
              </div>
              <div className="space-y-2">
                {Object.entries(sectionNotes)
                  .filter(([, note]) => note.hasIssue && note.note)
                  .map(([sectionId, note]) => {
                    const sectionName = SECTIONS.find((s) => s.id === sectionId)?.title;
                    return (
                      <div key={sectionId} className="text-sm">
                        <span className="text-yellow-400 font-medium">{sectionName}:</span>
                        <span className="text-gray-300 ml-2">{note.note}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <button
            onClick={submitReport}
            disabled={isSending}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-bold uppercase tracking-wider transition-colors ${
              hasAnyIssues
                ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
                : "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
            } disabled:opacity-50`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {hasAnyIssues ? "Send Fejlrapport" : "Afslut Uden Fejl"}
          </button>

          <button
            onClick={() => setShowReport(false)}
            className="w-full mt-3 p-3 text-gray-400 hover:text-white transition-colors"
          >
            Tilbage til tjekliste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
      <div className="bg-battle-grey/20 border border-white/10 rounded-xl tablet:rounded-2xl p-4 tablet:p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h2 className="text-base tablet:text-xl font-bold text-white uppercase tracking-wider">
                {section.title}
              </h2>
              <p className="text-[10px] tablet:text-xs text-orange-400 uppercase">{section.subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={checkAllSection}
              className="p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={resetSection}
              className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
          {SECTIONS.map((s, idx) => {
            const sChecked = checkedItems[s.id]?.size || 0;
            const sTotal = s.items.length;
            const isComplete = sChecked === sTotal;
            const hasNote = sectionNotes[s.id]?.hasIssue;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentSection(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                  idx === currentSection
                    ? "bg-battle-orange text-white"
                    : isComplete && !hasNote
                    ? "bg-green-500/30 text-green-400 border border-green-500/30"
                    : hasNote
                    ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/30"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                {s.id === "box" ? "Box" : `Rum ${idx}`}
              </button>
            );
          })}
        </div>

        {/* Overall progress */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>
              Total: {totalChecked}/{totalItems}
            </span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-1.5 bg-battle-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                overallProgress === 100 ? "bg-green-500" : "bg-battle-orange/50"
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Section progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>
              {sectionChecked.size} / {section.items.length}
            </span>
            <span>{Math.round(sectionProgress)}%</span>
          </div>
          <div className="h-2 bg-battle-black/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                sectionProgress === 100 ? "bg-green-500" : "bg-battle-orange"
              }`}
              style={{ width: `${sectionProgress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
          {section.items.map((item) => {
            const isChecked = sectionChecked.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                  isChecked
                    ? "bg-green-500/20 border border-green-500/30"
                    : "bg-battle-black/30 border border-white/5 hover:border-white/20"
                }`}
              >
                {isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span
                    className={`text-sm tablet:text-base block ${
                      isChecked ? "text-green-400 line-through" : "text-white"
                    }`}
                  >
                    {item.text}
                  </span>
                  {item.subtext && (
                    <span className={`text-xs ${isChecked ? "text-green-400/60" : "text-gray-500"}`}>
                      {item.subtext}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div className="mb-4">
          {sectionNotes[section.id]?.hasIssue ? (
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400">{sectionNotes[section.id].note}</p>
                </div>
                <button onClick={clearNote} className="text-yellow-400/50 hover:text-yellow-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : showNoteInput ? (
            <div className="space-y-2">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Beskriv fejl/mangel..."
                rows={2}
                className="w-full bg-battle-black/50 border border-yellow-500/30 rounded-lg p-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNote}
                  disabled={!currentNote.trim()}
                  className="flex-1 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm uppercase disabled:opacity-50"
                >
                  Gem Note
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setCurrentNote("");
                  }}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-400 text-sm"
                >
                  Annuller
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNoteInput(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-yellow-500/30 rounded-lg text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Tilføj fejl/mangel til denne sektion</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={goPrev}
            disabled={currentSection === 0}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Forrige
          </button>
          <button
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-battle-orange/20 border border-battle-orange/30 rounded-lg text-battle-orange hover:bg-battle-orange/30 transition-colors"
          >
            {currentSection === SECTIONS.length - 1 ? "Afslut" : "Næste"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={resetAll}
          className="w-full mt-3 p-2 text-xs text-gray-500 hover:text-red-400 transition-colors uppercase"
        >
          Nulstil Hele Tjeklisten
        </button>
      </div>
    </div>
  );
};

export default TeamBoxChecklist;
