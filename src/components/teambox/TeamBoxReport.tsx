import React, { useState } from "react";
import { Send, AlertTriangle, CheckCircle2, Loader2, AlertOctagon, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FEJL_GEAR_OPTIONS } from "@/lib/teamboxContent";

interface TeamBoxReportProps {
  onBack: () => void;
}

const TeamBoxReport: React.FC<TeamBoxReportProps> = ({ onBack }) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [gear, setGear] = useState("");
  const [description, setDescription] = useState("");
  const [haster, setHaster] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!gear || !description) {
      setError("Udfyld venligst gear og beskrivelse");
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const { error: dbError } = await supabase.from("fejlsogning_reports").insert({
        activity: "teambox",
        activity_name: "TeamBox",
        date,
        gear,
        description: `${haster ? "[HASTER] " : ""}${description}`,
        reported_by: "gear",
        reported_by_name: "GEAR",
        created_at: new Date().toISOString(),
      });
      if (dbError) {
        setError(dbError.message || "Fejl ved indsendelse");
        setIsSending(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError("Fejl ved afsendelse af rapport");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
        <div className="bg-battle-grey/20 border border-green-500/30 rounded-xl tablet:rounded-2xl p-6 tablet:p-8 backdrop-blur-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-400 uppercase tracking-wider mb-2">Rapport Sendt!</h2>
          <p className="text-gray-400 mb-2">Din fejlrapport er gemt.</p>
          {haster && (
            <p className="text-red-400 text-sm mb-4">🚨 Markeret som HASTER.</p>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => {
                setSent(false);
                setGear("");
                setDescription("");
                setHaster(false);
              }}
              className="px-6 py-3 bg-battle-orange/20 border border-battle-orange/30 rounded-lg text-battle-orange uppercase tracking-wider hover:bg-battle-orange/30 transition-colors"
            >
              Opret Ny Rapport
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

  return (
    <div className="w-full max-w-2xl mx-auto px-2 tablet:px-4">
      <div className="bg-battle-grey/20 border border-yellow-500/30 rounded-xl tablet:rounded-2xl p-4 tablet:p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
            <AlertTriangle className="w-6 h-6 tablet:w-8 tablet:h-8 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg tablet:text-xl font-bold text-yellow-400 uppercase tracking-wider">Fejlrapport</h2>
            <p className="text-xs tablet:text-sm text-yellow-400/70 uppercase">TeamBox</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setHaster(!haster)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
              haster
                ? "border-red-500 bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                : "border-white/10 bg-battle-black/30 hover:border-red-500/40"
            }`}
          >
            <AlertOctagon className={`w-6 h-6 ${haster ? "text-red-400" : "text-gray-500"}`} />
            <div className="flex-1 text-left">
              <span className={`font-bold uppercase tracking-wider text-sm ${haster ? "text-red-400" : "text-gray-400"}`}>
                HASTER
              </span>
              <p className="text-xs text-gray-500">
                {haster ? "Markeret som kritisk" : "Markér hvis fejlen er kritisk"}
              </p>
            </div>
            <div
              className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center ${
                haster ? "bg-red-500 justify-end" : "bg-gray-600 justify-start"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white mx-1 transition-transform shadow-sm" />
            </div>
          </button>

          <div>
            <label className="block text-xs text-yellow-400/70 uppercase tracking-wider mb-2">Dato</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-battle-black/50 border border-yellow-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-yellow-400/70 uppercase tracking-wider mb-2">
              Hvilket gear drejer det sig om?
            </label>
            <select
              value={gear}
              onChange={(e) => setGear(e.target.value)}
              className="w-full bg-battle-black/50 border border-yellow-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
            >
              <option value="">Vælg gear...</option>
              {FEJL_GEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-yellow-400/70 uppercase tracking-wider mb-2">Beskriv fejlen</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hvad er problemet? Hvornår opstod det? Hvad har du prøvet?"
              rows={4}
              className="w-full bg-battle-black/50 border border-yellow-500/30 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSending || !gear || !description}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              haster
                ? "bg-red-500/20 border-2 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
            }`}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {haster ? "🚨 Send Haste-Rapport" : "Send Rapport"}
          </button>

          <p className="text-xs text-yellow-400/50 text-center">Rapporten gemmes til administrationen</p>
        </div>
      </div>
    </div>
  );
};

export default TeamBoxReport;
