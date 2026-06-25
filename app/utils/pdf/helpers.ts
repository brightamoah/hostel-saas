import type { DateType } from "./types";
import { useDateFormat } from "@vueuse/core";

export function formatMoney(amount: number | string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "code",
  }).format(Number(amount));
}

export function formatDate(date: Date | string | null, type: DateType = "long") {
  if (!date) return "N/A";

  if (type === "short") return useDateFormat(date, "D MMM YYYY").value;
  if (type === "medium") return useDateFormat(date, "ddd, MMM D, YYYY").value;
  return useDateFormat(date, "dddd, MMMM D, YYYY").value;
}

export function formatDatetime(date: Date | string | null, type: DateType = "long") {
  if (!date) return "N/A";

  if (type === "short") return useDateFormat(date, "D MMM YYYY - HH:mm").value;
  if (type === "medium") return useDateFormat(date, "ddd, MMM D, YYYY - HH:mm").value;
  return useDateFormat(date, "dddd, MMMM D, YYYY - HH:mm").value;
}

export function getDaysDifference(start: Date | string, end: Date | string) {
  if (start == null || end == null) return 30;
  const date1 = new Date(start);
  const date2 = new Date(end);
  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return 30;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function resolveColorToHex(color?: string, defaultHex = "#214d49"): string {
  if (!color) return defaultHex;
  if (color.startsWith("#")) return color;
  const map: Record<string, string> = {
    slate: "#64748b",
    gray: "#6b7280",
    zinc: "#71717a",
    neutral: "#737373",
    stone: "#78716c",
    red: "#ef4444",
    orange: "#f97316",
    amber: "#f59e0b",
    yellow: "#eab308",
    lime: "#84cc16",
    green: "#22c55e",
    emerald: "#10b981",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    sky: "#0ea5e9",
    blue: "#3b82f6",
    indigo: "#6366f1",
    violet: "#8b5cf6",
    purple: "#a855f7",
    fuchsia: "#d946ef",
    pink: "#ec4899",
    rose: "#f43f5e",
  };
  return map[color.toLowerCase()] || defaultHex;
}

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await $fetch<{ data: string }>(`/api/utils/proxyImage?url=${encodeURIComponent(url)}`);
    return response.data || null;
  }
  catch {
    return null;
  }
}

export function fmt(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

export function cellText(value: any, d: FieldDescriptor): string {
  if (value === null || value === undefined) return "—";
  switch (d.type) {
    case "currency": return formatMoney(value);
    case "date": return formatDate(value, "short");
    case "datetime": return formatDatetime(value, "short");
    case "number": return String(Number(value));
    case "badge": return capitalizeWords(String(value));
    default:
      if (
        d.key.toLowerCase().includes("email")
        || d.key.toLowerCase().includes("phone")
        || d.key.toLowerCase().includes("invoice")
      ) {
        return String(value);
      }
      if (Array.isArray(value)) {
        return value.map(v => capitalizeWords(String(v).trim())).join(", ");
      }
      if (typeof value === "string" && value.includes(",")) {
        return value.split(",").map(v => capitalizeWords(v.trim())).join(", ");
      }
      return capitalizeWords(String(value));
  }
}
