export interface FieldDescriptor {
  key: string;
  label: string;
  /** How to format the value in the PDF / table */
  type: "string" | "number" | "currency" | "date" | "datetime" | "badge";
  /** Optional badge colour map (for status-type fields) */
  badgeMap?: Record<string, string>;
  /** If true, this field can be used as a sort column */
  sortable?: boolean;
  /** If true, can be used as a date range anchor */
  dateAnchor?: boolean;
  /** If true, the PDF generator will count occurrences of this field in the summary block */
  aggregate?: boolean;
}

export const MODULE_STATUSES: Record<ReportModule, string[]> = {
  billing: ["unpaid", "fully paid", "partially paid", "overdue", "cancelled"],
  payment: ["completed", "failed", "pending", "refunded"],
  rooms: ["vacant", "fully occupied", "partially occupied", "under maintenance", "reserved"],
  allocation: ["active", "expired", "pending", "cancelled"],
  student: [],
  visitor: ["pending", "approved", "denied", "checked-in", "checked-out", "cancelled"],
  maintenanceRequest: ["pending", "assigned", "in-progress", "completed", "rejected"],
  complaint: ["pending", "in-progress", "resolved", "rejected"],
  user: [],
};

export const MODULE_FIELDS: Record<ReportModule, FieldDescriptor[]> = {
  billing: [
    { key: "invoiceNumber", label: "Invoice No.", type: "string", sortable: true },
    { key: "studentName", label: "Student Name", type: "string", sortable: true },
    { key: "amount", label: "Amount", type: "currency", sortable: true },
    { key: "paidAmount", label: "Paid Amount", type: "currency" },
    { key: "lateFee", label: "Late Fee", type: "currency" },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "fully paid": "#16a34a",
      "partially paid": "#d97706",
      "unpaid": "#64748b",
      "overdue": "#dc2626",
      "cancelled": "#9ca3af",
    }, sortable: true },
    { key: "type", label: "Type", type: "string", sortable: true },
    { key: "academicPeriod", label: "Academic Period", type: "string" },
    { key: "dateIssued", label: "Date Issued", type: "date", sortable: true, dateAnchor: true },
    { key: "dueDate", label: "Due Date", type: "date", sortable: true },
    { key: "createdAt", label: "Created At", type: "datetime", sortable: true },
  ],
  payment: [
    { key: "transactionReference", label: "Transaction Ref", type: "string", sortable: true },
    { key: "studentName", label: "Student Name", type: "string", sortable: true },
    { key: "amount", label: "Amount", type: "currency", sortable: true },
    { key: "paymentMethod", label: "Payment Method", type: "string", aggregate: true },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "completed": "#16a34a",
      "pending": "#d97706",
      "failed": "#dc2626",
      "refunded": "#64748b",
    }, sortable: true, aggregate: true },
    { key: "invoiceNumber", label: "Invoice No.", type: "string" },
    { key: "paymentDate", label: "Payment Date", type: "datetime", sortable: true, dateAnchor: true },
  ],
  rooms: [
    { key: "roomNumber", label: "Room No.", type: "string", sortable: true },
    { key: "floor", label: "Floor", type: "number", sortable: true },
    { key: "roomType", label: "Type", type: "string", sortable: true, aggregate: true },
    { key: "capacity", label: "Capacity", type: "number", sortable: true },
    { key: "currentOccupancy", label: "Occupancy", type: "number", sortable: true },
    { key: "amountPerYear", label: "Amount/Year", type: "currency", sortable: true },
    { key: "allowedGender", label: "Gender", type: "string" },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "vacant": "#16a34a",
      "fully occupied": "#dc2626",
      "partially occupied": "#d97706",
      "under maintenance": "#f59e0b",
      "reserved": "#6366f1",
    }, sortable: true },
    { key: "features", label: "Features", type: "string" },
  ],
  allocation: [
    { key: "studentName", label: "Student Name", type: "string", sortable: true },
    { key: "roomNumber", label: "Room No.", type: "string", sortable: true },
    { key: "academicYear", label: "Academic Year", type: "string", sortable: true, aggregate: true },
    { key: "academicPeriod", label: "Academic Period", type: "string", aggregate: true },
    { key: "allocationDate", label: "Allocation Date", type: "date", sortable: true, dateAnchor: true },
    { key: "endDate", label: "End Date", type: "date", sortable: true },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "active": "#16a34a",
      "pending": "#d97706",
      "expired": "#64748b",
      "cancelled": "#dc2626",
    }, sortable: true, aggregate: true },
  ],
  student: [
    { key: "studentId", label: "Student ID", type: "number", sortable: true },
    { key: "name", label: "Name", type: "string", sortable: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "gender", label: "Gender", type: "string", aggregate: true },
    { key: "roomNumber", label: "Room", type: "string", sortable: true },
    { key: "academicPeriod", label: "Academic Period", type: "string" },
    { key: "createdAt", label: "Enrolled At", type: "date", sortable: true, dateAnchor: true },
  ],
  visitor: [
    { key: "name", label: "Name", type: "string", sortable: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "relationship", label: "Relationship", type: "string" },
    { key: "purpose", label: "Purpose", type: "string" },
    { key: "visitDate", label: "Visit Date", type: "date", sortable: true, dateAnchor: true },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "pending": "#d97706",
      "approved": "#16a34a",
      "denied": "#dc2626",
      "checked-in": "#6366f1",
      "checked-out": "#64748b",
      "cancelled": "#9ca3af",
    }, sortable: true, aggregate: true },
    { key: "studentName", label: "Visited Student", type: "string" },
    { key: "createdAt", label: "Registered At", type: "datetime", sortable: true },
  ],
  maintenanceRequest: [
    { key: "issueType", label: "Issue Type", type: "string", sortable: true },
    { key: "priority", label: "Priority", type: "badge", badgeMap: {
      low: "#64748b",
      medium: "#d97706",
      high: "#ea580c",
      emergency: "#dc2626",
    }, sortable: true, aggregate: true },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "pending": "#d97706",
      "assigned": "#6366f1",
      "in-progress": "#0ea5e9",
      "completed": "#16a34a",
      "rejected": "#dc2626",
    }, sortable: true, aggregate: true },
    { key: "studentName", label: "Reported By", type: "string" },
    { key: "roomNumber", label: "Room", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "createdAt", label: "Reported At", type: "datetime", sortable: true, dateAnchor: true },
  ],
  complaint: [
    { key: "type", label: "Type", type: "string", sortable: true },
    { key: "priority", label: "Priority", type: "badge", badgeMap: {
      low: "#64748b",
      medium: "#d97706",
      high: "#ea580c",
      emergency: "#dc2626",
    }, sortable: true, aggregate: true },
    { key: "status", label: "Status", type: "badge", badgeMap: {
      "pending": "#d97706",
      "in-progress": "#0ea5e9",
      "resolved": "#16a34a",
      "rejected": "#dc2626",
    }, sortable: true, aggregate: true },
    { key: "studentName", label: "Reported By", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "createdAt", label: "Reported At", type: "datetime", sortable: true, dateAnchor: true },
  ],
  user: [
    { key: "name", label: "Name", type: "string", sortable: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "role", label: "Role", type: "string", aggregate: true },
    { key: "createdAt", label: "Created At", type: "datetime", sortable: true, dateAnchor: true },
  ],
};

export interface PrebuiltTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  module: ReportModule;
  defaultFields: string[];
  defaultFilters?: Record<string, string>;
  defaultStatusFilter?: string[];
  defaultSortBy?: string;
  defaultSortDir?: "asc" | "desc";
  /** Whether this template has a meaningful date range filter */
  usesDateRange?: boolean;
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: "billing-outstanding",
    title: "Outstanding Payments",
    description: "All unpaid and overdue invoices with balances",
    icon: "i-heroicons-banknotes",
    module: "billing",
    defaultFields: ["invoiceNumber", "studentName", "amount", "paidAmount", "status", "dueDate"],
    defaultStatusFilter: ["unpaid", "overdue", "partially paid"],
    defaultSortBy: "dueDate",
    defaultSortDir: "asc",
    usesDateRange: true,
  },
  {
    id: "billing-collection",
    title: "Payment Collection Summary",
    description: "Overview of all billing records and payment status",
    icon: "i-lucide-receipt",
    module: "billing",
    defaultFields: ["invoiceNumber", "studentName", "amount", "paidAmount", "lateFee", "status", "academicPeriod", "dateIssued"],
    defaultSortBy: "dateIssued",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "payment-history",
    title: "Payment Transactions",
    description: "All successful and failed payment attempts",
    icon: "i-lucide-credit-card",
    module: "payment",
    defaultFields: ["transactionReference", "studentName", "amount", "paymentMethod", "status", "paymentDate", "invoiceNumber"],
    defaultSortBy: "paymentDate",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "allocation-active",
    title: "Active Allocations",
    description: "Currently active room assignments for students",
    icon: "i-lucide-bed-double",
    module: "allocation",
    defaultFields: ["studentName", "roomNumber", "academicYear", "academicPeriod", "allocationDate", "status"],
    defaultStatusFilter: ["active"],
    defaultSortBy: "allocationDate",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "rooms-occupancy",
    title: "Room Occupancy Report",
    description: "All rooms with occupancy vs capacity",
    icon: "i-lucide-building-2",
    module: "rooms",
    defaultFields: ["roomNumber", "floor", "roomType", "capacity", "currentOccupancy", "status", "allowedGender"],
    defaultSortBy: "roomNumber",
    defaultSortDir: "asc",
  },
  {
    id: "rooms-available",
    title: "Available Rooms",
    description: "Rooms currently vacant or partially occupied",
    icon: "i-lucide-door-open",
    module: "rooms",
    defaultFields: ["roomNumber", "floor", "roomType", "capacity", "currentOccupancy", "amountPerYear", "allowedGender"],
    defaultStatusFilter: ["vacant", "partially occupied"],
    defaultSortBy: "floor",
    defaultSortDir: "asc",
  },
  {
    id: "students-enrolled",
    title: "Student Enrolment Report",
    description: "All registered students with room assignments",
    icon: "i-lucide-users",
    module: "student",
    defaultFields: ["studentId", "name", "email", "phoneNumber", "gender", "roomNumber", "academicPeriod", "createdAt"],
    defaultSortBy: "name",
    defaultSortDir: "asc",
    usesDateRange: true,
  },
  {
    id: "visitors-log",
    title: "Visitor Log",
    description: "All visitor records with approval status",
    icon: "i-lucide-user-check",
    module: "visitor",
    defaultFields: ["name", "phoneNumber", "purpose", "relationship", "visitDate", "status", "studentName"],
    defaultSortBy: "visitDate",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "maintenance-open",
    title: "Open Maintenance Requests",
    description: "Pending and in-progress maintenance issues",
    icon: "i-lucide-wrench",
    module: "maintenanceRequest",
    defaultFields: ["issueType", "priority", "status", "studentName", "roomNumber", "description", "createdAt"],
    defaultStatusFilter: ["pending", "assigned", "in-progress"],
    defaultSortBy: "priority",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "complaints-summary",
    title: "Complaints Summary",
    description: "All complaints grouped by status and priority",
    icon: "i-lucide-message-circle-warning",
    module: "complaint",
    defaultFields: ["type", "priority", "status", "studentName", "description", "createdAt"],
    defaultSortBy: "priority",
    defaultSortDir: "desc",
    usesDateRange: true,
  },
  {
    id: "users",
    title: "Users Report",
    description: "All users with their roles and contact information",
    icon: "i-lucide-user-cog",
    module: "user",
    defaultFields: ["name", "email", "phoneNumber", "role", "createdAt"],
    defaultSortBy: "name",
    defaultSortDir: "asc",
    usesDateRange: true,
  },
];
