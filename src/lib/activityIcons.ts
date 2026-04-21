import {
  Zap,
  Feather,
  Bike,
  Box,
  Trophy,
  Sliders,
  Utensils,
  Gamepad2,
  Link2,
  Hammer,
  Swords,
  Car,
  Globe,
  Sparkles,
  Users,
  Package,
  type LucideIcon,
} from "lucide-react";

export function pickIconForActivity(name: string | undefined): LucideIcon {
  if (!name) return Package;
  const n = name.toLowerCase();
  if (n.includes("lazer")) return Zap;
  if (n.includes("robin")) return Feather;
  if (n.includes("segway") || n.includes("scooter")) return Bike;
  if (n.includes("box")) return Box;
  if (n.includes("challenge")) return Trophy;
  if (n.includes("control")) return Sliders;
  if (n.includes("taste") || n.includes("smag")) return Utensils;
  if (n.includes("play") || n.includes("leg")) return Gamepad2;
  if (n.includes("connect") || n.includes("forbind")) return Link2;
  if (n.includes("construct")) return Hammer;
  if (n.includes("action")) return Swords;
  if (n.includes("race")) return Car;
  if (n.includes("world")) return Globe;
  if (n.includes("diverse")) return Sparkles;
  return Users;
}

export function getActivitySubtitle(name: string | undefined): string {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("challenge")) return "Competition";
  if (n.includes("lazer")) return "Laser Combat";
  if (n.includes("robin")) return "Archery";
  if (n.includes("box")) return "Portable Events";
  if (n.includes("connect")) return "Networking";
  if (n.includes("play")) return "Cooperation";
  if (n.includes("taste")) return "Culinary";
  if (n.includes("segway")) return "Transporters";
  if (n.includes("control")) return "Strategy";
  if (n.includes("construct")) return "Building";
  if (n.includes("action")) return "High Intensity";
  if (n.includes("race")) return "Racing";
  if (n.includes("world")) return "Global";
  if (n.includes("diverse")) return "Diverse";
  return "";
}

export function resolveColorCode(code?: string | null): string | null {
  if (!code) return null;
  const raw = code.trim();
  const lower = raw.toLowerCase();
  if (raw.startsWith("#") || lower.startsWith("rgb(") || lower.startsWith("rgba(")) return raw;
  const map: Record<string, string> = {
    rød: "#ff3b30",
    rod: "#ff3b30",
    blå: "#0ea5e9",
    bla: "#0ea5e9",
    grøn: "#10b981",
    groen: "#10b981",
    gron: "#10b981",
    gul: "#f59e0b",
    orange: "#fb923c",
    sort: "#111827",
    hvid: "#ffffff",
    pink: "#ff49a1",
    lilla: "#7c3aed",
    brun: "#7c3e0f",
    grå: "#6b7280",
    gra: "#6b7280",
  };
  if (map[lower]) return map[lower];
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`;
  return raw;
}
