export const maintenanceTypeIconMap: Record<MaintenanceType["issueType"], string> = {
  "plumbing": "i-lucide-shower-head",
  "electrical": "i-lucide-plug-zap",
  "furniture": "i-lucide-sofa",
  "cleaning": "i-lucide-brush-cleaning",
  "appliance": "i-lucide-air-vent",
  "structural": "i-lucide-house",
  "pest control": "i-lucide-bug",
  "internet/Wi-Fi": "i-lucide-wifi",
  "other": "i-lucide-wrench",
};

export const priorityColorMap: Record<MaintenanceType["priority"], ColorType> = {
  low: "success",
  medium: "info",
  high: "warning",
  emergency: "error",
};

export const studentStatusColorMap: Record<Student["residencyStatus"] | "N/A", ColorType> = {
  "active": "success",
  "graduated": "info",
  "inactive": "error",
  "suspended": "warning",
  "withdrawn": "neutral",
  "N/A": "neutral",
};

export const maintenanceStatusColorMap: Record<MaintenanceType["status"], ColorType> = {
  "in-progress": "secondary",
  "assigned": "neutral",
  "completed": "success",
  "pending": "warning",
  "rejected": "error",
};

export const visitorStatusColorMap: Record<VisitorType["status"], ColorType> = {
  "pending": "warning",
  "approved": "info",
  "checked-in": "success",
  "checked-out": "neutral",
  "cancelled": "error",
  "denied": "error",
};

export const complaintTypeIconMap: Record<Complaint["type"], string> = {
  "amenities": "i-lucide-plug-zap",
  "noise": "i-lucide-volume-2",
  "security": "i-lucide-door-closed-locked",
  "billing issue": "i-lucide-banknote",
  "room condition": "i-lucide-door-open",
  "staff behavior": "i-lucide-users",
  "other": "i-lucide-panel-bottom-dashed",
};

export const complaintStatusColorMap: Record<Complaint["status"], ColorType> = {
  "in-progress": "info",
  "pending": "warning",
  "resolved": "success",
  "rejected": "error",
};

type CharStatus = "normal" | "warning" | "error";

interface CharCountInfo {
  description: ColorType | "muted";
  progress: ColorType;
}

export const charCountMap: Record<CharStatus, CharCountInfo> = {
  normal: {
    description: "muted",
    progress: "success",
  },
  warning: {
    description: "warning",
    progress: "warning",
  },
  error: {
    description: "error",
    progress: "error",
  },
};

export const roomStatusColorMap: Record<HostelRoom["status"], ColorType> = {
  "vacant": "success",
  "partially occupied": "info",
  "fully occupied": "error",
  "under maintenance": "warning",
  "reserved": "neutral",
};

export const billingStatusColorMap: Record<Billing["status"], ColorType> = {
  "unpaid": "secondary",
  "partially paid": "warning",
  "fully paid": "success",
  "overdue": "error",
  "cancelled": "neutral",
};

export type PaymentStatus = PaystackStatus | Billing["payments"][number]["status"];

export const paymentStatusColorMap: Record<PaymentStatus, ColorType> = {
  pending: "warning",
  success: "success",
  failed: "error",
  abandoned: "neutral",
  ongoing: "info",
  processing: "info",
  queued: "info",
  reversed: "error",
  completed: "success",
  refunded: "error",
};

export const onboardingImportStatusColorMap: Record<OnboardingImportStatus, ColorType> = {
  completed: "success",
  pending: "warning",
  failed: "error",
};

export const paymentMethodIconMap: Record<Payment["paymentMethod"], string> = {
  "card": "i-heroicons-credit-card",
  "bank transfer": "i-heroicons-building-library",
  "cash": "i-heroicons-banknotes",
  "mobile money": "i-lucide-smartphone",
  "other": "i-lucide-ellipsis",
};

export const transactionStatusIconMap: Record<PaymentTransaction["status"], string> = {
  pending: "i-lucide-clock",
  failed: "i-lucide-circle-x",
  completed: "i-lucide-circle-check-big",
  refunded: "i-heroicons-credit-card",
};
