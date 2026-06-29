import type { DateType } from "./pdf/types";
import { useDateFormat } from "@vueuse/core";

export function formatAppDate(date: Date | string | null, type: DateType = "long") {
  if (!date) return "N/A";
  if (type === "short") return useDateFormat(date, "D MMM YYYY").value;
  if (type === "medium") return useDateFormat(date, "ddd, MMM D, YYYY").value;
  return useDateFormat(date, "dddd, MMMM D, YYYY").value;
}

export function formatAppDatetime(date: Date | string | null, type: DateType = "long") {
  if (!date) return "N/A";
  if (type === "short") return useDateFormat(date, "D MMM YYYY - HH:mm").value;
  if (type === "medium") return useDateFormat(date, "ddd, MMM D, YYYY - HH:mm").value;
  return useDateFormat(date, "dddd, MMMM D, YYYY - HH:mm").value;
}
