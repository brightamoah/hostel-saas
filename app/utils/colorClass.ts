export function getColorClass(color: string, type: "text" | "border" | "bg" | "ring" | "border-b" | "border-t", opacity?: number): string {
  const colorMap: Record<string, string> = {
    primary: "primary",
    error: "error",
    warning: "warning",
    info: "info",
    success: "success",
    neutral: "neutral",
  };
  const baseColor = colorMap[color] || "gray-500";

  switch (type) {
    case "text":
      return opacity ? `text-${baseColor}/${opacity}` : `text-${baseColor}`;
    case "border":
      return `border-${baseColor}`;
    case "bg":
      return opacity ? `bg-${baseColor}/${opacity}` : `bg-${baseColor}`;
    case "ring":
      return `ring-${baseColor}`;
    case "border-b":
      return `border-b-${baseColor}`;
    case "border-t":
      return `border-t-${baseColor}`;
    default:
      return "";
  }
}

export const UI_COLORS: { label: string; value: string; hex: string }[] = [
  { label: "Default", value: "#29756f", hex: "#29756f" },
  { label: "Red", value: "#EF4444", hex: "#EF4444" },
  { label: "Orange", value: "#F97316", hex: "#F97316" },
  { label: "Amber", value: "#F59E0B", hex: "#F59E0B" },
  { label: "Yellow", value: "#EAB308", hex: "#EAB308" },
  { label: "Lime", value: "#84CC16", hex: "#84CC16" },
  { label: "Green", value: "#22C55E", hex: "#22C55E" },
  { label: "Emerald", value: "#10B981", hex: "#10B981" },
  { label: "Teal", value: "#14B8A6", hex: "#14B8A6" },
  { label: "Cyan", value: "#06B6D4", hex: "#06B6D4" },
  { label: "Sky", value: "#0EA5E9", hex: "#0EA5E9" },
  { label: "Blue", value: "#3B82F6", hex: "#3B82F6" },
  { label: "Indigo", value: "#6366F1", hex: "#6366F1" },
  { label: "Violet", value: "#8B5CF6", hex: "#8B5CF6" },
  { label: "Purple", value: "#A855F7", hex: "#A855F7" },
  { label: "Fuchsia", value: "#D946EF", hex: "#D946EF" },
  { label: "Pink", value: "#EC4899", hex: "#EC4899" },
  { label: "Rose", value: "#F43F5E", hex: "#F43F5E" },
];

export const NEUTRAL_COLORS: { label: string; value: string; hex: string }[] = [
  { label: "Default Accent", value: "#737373", hex: "#737373" },
  { label: "Slate", value: "#64748B", hex: "#64748B" },
  { label: "Gray", value: "#6B7280", hex: "#6B7280" },
  { label: "Zinc", value: "#71717A", hex: "#71717A" },
  // { label: "Neutral", value: "#737373", hex: "#737373" },
  { label: "Stone", value: "#78716C", hex: "#78716C" },
  { label: "Mist", value: "#6b7d8b", hex: "#6b7d8b" },
  { label: "Taupe", value: "#8b7d6b", hex: "#8b7d6b" },
  { label: "Mauve", value: "#8b7d8b", hex: "#8b7d8b" },
  { label: "Olive", value: "#6b7d6b", hex: "#6b7d6b" },

];

export function colorLabel(hex: string | undefined): string {
  if (!hex) return "";
  const allColors = [...UI_COLORS, ...NEUTRAL_COLORS];

  const found = allColors.find(c => c.value.toLowerCase() === hex.toLowerCase());
  const label = found?.label ?? hex;

  let displayLabel = label;

  if (label.toLowerCase() === "default") displayLabel = "Drake";
  if (label.toLowerCase() === "default accent") displayLabel = "neutral";

  return displayLabel;
}
