import { supabase } from "@/lib/supabase";

export interface TeamboxReportInput {
  activityName: string;
  date: string; // YYYY-MM-DD
  gear: string;
  description: string;
}

/**
 * Gemmer en TeamBox-fejlrapport i `fejlsogning_reports`.
 *
 * /teambox bruges af instruktører på TeamBox-tablets, ofte uden login. Efter
 * RLS-lockdown på MAIN må anon ikke skrive direkte i tabellen, så rapporten går
 * gennem SECURITY DEFINER-RPC'en `gear_submit_teambox_report`
 * (supabase/migrations/20261117130000_gear_rpcs.sql). Findes RPC'en ikke endnu,
 * falder vi tilbage til det gamle direkte insert, så intet går tabt før migrationen.
 */
export async function submitTeamboxReport(input: TeamboxReportInput): Promise<{ error: string | null }> {
  const { error: rpcError } = await supabase.rpc("gear_submit_teambox_report", {
    p_activity_name: input.activityName,
    p_date: input.date,
    p_gear: input.gear,
    p_description: input.description,
  });
  if (!rpcError) return { error: null };

  const { error } = await supabase.from("fejlsogning_reports").insert({
    activity: "teambox",
    activity_name: input.activityName,
    date: input.date,
    gear: input.gear,
    description: input.description,
    reported_by: "gear",
    reported_by_name: "GEAR",
    created_at: new Date().toISOString(),
  });
  return { error: error ? error.message || "Fejl ved indsendelse" : null };
}
