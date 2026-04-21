import { supabase } from "./supabase";

export type Gear = {
  id: string;
  name: string;
  activity_slug: string;
  geartype_id: string | null;
  geartype?: { id: string; name: string } | null;
  location: string | null;
  serial_numbers: string | null;
  color_code: string | null;
  description: string | null;
  image_url: string | null;
  pdf_url: string | null;
  out_of_service: boolean;
  out_of_service_reason: string | null;
  frequency: string | null;
  battery_change_date: string | null;
  emei_number: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Geartype = { id: string; name: string };

export type GearBox = {
  id: string;
  gear_id: string | null;
  name: string;
  box_number: number | null;
  out_of_service: boolean;
  out_of_service_reason: string | null;
};

export type GearIssue = {
  id: string;
  gear_id: string;
  title: string | null;
  description: string | null;
  assigned_to: string | null;
  priority: string | null;
  status: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}]`, err);
    return fallback;
  }
}

export async function listAllGear(): Promise<Gear[]> {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("gear")
        .select("*, geartype:geartypes(id,name)")
        .order("name");
      if (error) throw error;
      return (data || []) as Gear[];
    },
    [],
    "listAllGear",
  );
}

export async function getGearByActivity(activitySlug: string): Promise<Gear[]> {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("gear")
        .select("*, geartype:geartypes(id,name)")
        .eq("activity_slug", activitySlug)
        .order("name");
      if (error) throw error;
      return (data || []) as Gear[];
    },
    [],
    "getGearByActivity",
  );
}

export async function createGear(payload: Partial<Gear>) {
  const { data, error } = await supabase.from("gear").insert(payload).select().single();
  if (error) throw error;
  return data as Gear;
}

export async function updateGear(id: string, updates: Partial<Gear>) {
  const { data, error } = await supabase
    .from("gear")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Gear;
}

export async function deleteGear(id: string) {
  const { error } = await supabase.from("gear").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function getGeartypes(): Promise<Geartype[]> {
  return safe(
    async () => {
      const { data, error } = await supabase.from("geartypes").select("*").order("name");
      if (error) throw error;
      return (data || []) as Geartype[];
    },
    [],
    "getGeartypes",
  );
}

export async function createGeartype(payload: { name: string }): Promise<Geartype> {
  const { data, error } = await supabase.from("geartypes").insert(payload).select().single();
  if (error) throw error;
  return data as Geartype;
}

export async function listGearSetAssignments(setId: string) {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("gear_set_assignments")
        .select("*")
        .eq("set_gear_id", setId);
      if (error) throw error;
      return data || [];
    },
    [],
    "listGearSetAssignments",
  );
}

export async function upsertGearSetAssignment(assignment: {
  set_gear_id: string;
  role: string;
  assigned_text?: string | null;
  assigned_gear_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("gear_set_assignments")
    .upsert(assignment, { onConflict: "set_gear_id,role" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listGearBoxesForGear(gearId: string): Promise<GearBox[]> {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("gear_boxes")
        .select("*")
        .eq("gear_id", gearId)
        .order("box_number");
      if (error) throw error;
      return (data || []) as GearBox[];
    },
    [],
    "listGearBoxesForGear",
  );
}

export async function ensureGearBoxesForGear(gearId: string): Promise<GearBox[]> {
  const existing = await listGearBoxesForGear(gearId);
  if (existing.length > 0) return existing;
  const defaults = Array.from({ length: 9 }, (_, i) => ({
    gear_id: gearId,
    box_number: i + 1,
    name: `Boks ${i + 1}`,
    out_of_service: false,
  }));
  const { data, error } = await supabase.from("gear_boxes").insert(defaults).select();
  if (error) {
    console.error("[ensureGearBoxesForGear]", error);
    return [];
  }
  return (data || []) as GearBox[];
}

export async function updateGearBox(boxId: string, updates: Partial<GearBox>) {
  const { data, error } = await supabase
    .from("gear_boxes")
    .update(updates)
    .eq("id", boxId)
    .select()
    .single();
  if (error) throw error;
  return data as GearBox;
}

export async function uploadGearImage(file: File, activitySlug: string): Promise<string> {
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]+/g, "_")}`;
  const buckets = ["assets", "images", "public", "media", "vehicle-docs", "course-assets"];
  let lastErr: unknown = null;
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(`gear/${activitySlug}/${safeName}`, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (error) {
        lastErr = error;
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("bucket") && msg.includes("not found")) continue;
        throw error;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      if (urlData?.publicUrl) return urlData.publicUrl;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Kunne ikke uploade billede: ${String(lastErr)}`);
}

export async function listGearIssues(gearId?: string): Promise<GearIssue[]> {
  return safe(
    async () => {
      let query = supabase.from("gear_issues").select("*");
      if (gearId) query = query.eq("gear_id", gearId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GearIssue[];
    },
    [],
    "listGearIssues",
  );
}

export async function createGearIssue(payload: Partial<GearIssue>) {
  const { data, error } = await supabase
    .from("gear_issues")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as GearIssue;
}

export async function updateGearIssue(id: string, updates: Partial<GearIssue>) {
  const { data, error } = await supabase
    .from("gear_issues")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as GearIssue;
}

export type Activity = {
  id: string;
  slug: string;
  name: string;
  color: string;
};

export async function listActivities(): Promise<Activity[]> {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,name,color")
        .order("created_at");
      if (error) throw error;
      return (data || []).map((a: { id: string; name: string; color: string | null }) => ({
        id: a.id,
        slug: slugify(a.id, a.name),
        name: a.name,
        color: a.color || "#ff6600",
      }));
    },
    [],
    "listActivities",
  );
}

export async function upsertActivity(a: { id: string; name: string; color: string }) {
  const { error } = await supabase.from("activities").upsert(a, { onConflict: "id" });
  if (error) throw error;
}

function slugify(id: string, name: string): string {
  if (id && /^[a-z0-9-]+$/i.test(id)) return id;
  if (name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  return id;
}

export async function listEmployees(): Promise<Array<{ id: string; navn: string }>> {
  return safe(
    async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,navn")
        .order("navn");
      if (error) throw error;
      return data || [];
    },
    [],
    "listEmployees",
  );
}
