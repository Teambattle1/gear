import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://ilbjytyukicbssqftmma.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmp5dHl1a2ljYnNzcWZ0bW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjEsImV4cCI6MjA3MDQwNjQ2MX0.I_PWByMPcOYhWgeq9MxXgOo-NCZYfEuzYmo35XnBFAY";

const url = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_URL;
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_ANON;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(url, anon);
  return client;
}

export const supabase = getSupabase();
