import { supabase } from "./supabase";

export type Tablet = {
  id: string;
  model: string;
  number: string;
  box_number: number | null;
  color: string | null;
  placering: string | null;
  mobile_subscription: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listTablets(): Promise<Tablet[]> {
  const { data, error } = await supabase
    .from("tablets")
    .select("*")
    .order("number");
  if (error) {
    console.error("[listTablets]", error);
    return [];
  }
  return (data || []) as Tablet[];
}

export async function createTablet(tablet: Partial<Tablet>): Promise<Tablet | null> {
  const { data, error } = await supabase
    .from("tablets")
    .insert(tablet)
    .select()
    .single();
  if (error) {
    console.error("[createTablet]", error);
    return null;
  }
  return data as Tablet;
}

export async function updateTablet(
  id: string,
  updates: Partial<Tablet>,
): Promise<Tablet | null> {
  const { data, error } = await supabase
    .from("tablets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[updateTablet]", error);
    return null;
  }
  return data as Tablet;
}

export async function deleteTablet(id: string): Promise<boolean> {
  const { error } = await supabase.from("tablets").delete().eq("id", id);
  if (error) {
    console.error("[deleteTablet]", error);
    return false;
  }
  return true;
}
