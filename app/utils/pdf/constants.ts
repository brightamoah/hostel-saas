export const TEXT_COLOR = "#333333";
export const GRAY_COLOR = "#666666";
export const BG_COLOR = "#f8f9fa";
export const BORDER_COLOR = "#dee2e6";
export const WHITE = "#ffffff";

export const DEFAULT_FONT = "helvetica";

export const STATUS_COLORS: Record<string, string> = {
  "fully paid": "#16a34a",
  "partially paid": "#d97706",
  "unpaid": "#333333",
  "overdue": "#dc2626",
  "cancelled": "#6b7280",
};

export const paymentStatusColorMapPdf: Record<string, string> = {
  completed: "#16a34a",
  failed: "#dc2626",
  pending: "#d97706",
  refunded: "#6b7280",
};
