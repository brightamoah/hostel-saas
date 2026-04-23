/// <reference lib="dom" />

import type { CalendarDate, DateValue } from "@internationalized/date";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Table } from "@tanstack/vue-table";
import type { useEditor } from "@tiptap/vue-3";
import type { User } from "#auth-utils";
import type { AnnouncementType } from "~~/server/db/queries/announcement";
import type { AdminBillingStats, BillingType, StudentBillingStats } from "~~/server/db/queries/billing";
import type { ComplaintData, ComplaintType } from "~~/server/db/queries/complaint";
import type { Maintenance, MaintenanceStats, StudentMaintenanceData } from "~~/server/db/queries/maintenance";
import type { AdminRoomStats, HostelRoomType, PaginatedHostel, Room as RoomType } from "~~/server/db/queries/room";
import type { StudentDashboard, UserProfileType, UserStats } from "~~/server/db/queries/user";
import type { Visitor, VisitorStats } from "~~/server/db/queries/visitor";
import type { admin, allocation, announcement, billing, complaint, complaintActionTakenEnum, complaintStatusEnum, hostel, loginAttempts, maintenanceRequest, maintenanceStatusEnum, room, student, user, visitor, visitorLogs } from "~~/server/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import type { useSession } from "h3";
import type { randomUUID } from "uncrypto";
import type { ComputedOptions, ConcreteComponent, MethodOptions, Ref, ShallowRef, ShallowUnwrapRef } from "vue";
import type { RouteLocationRaw, RouteQueryAndHash } from "vue-router";
import type z from "zod";

import type { ComplaintStatusResponseSchema, CreateMaintenanceSchema, MaintenanceStatusResponseSchema, RegisterVisitorSchema } from "../utils/schema";

export type DeepNonNullable<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type DateRange = {
  start: DateValue;
  end: DateValue;
};

export type UserProfile = UserProfileType;

export type DateModel = DateValue | DateRange | null;

export type CreateVisitor = Omit<RegisterVisitorSchema, "status" | "hostelId" | "studentId" | "visitDate"> & {
  visitDate: CalendarDate | undefined;
};

export type EditVisitor = {
  visitorId: number;
  data: Partial<CreateVisitor>;
};

export interface FontFamily {
  name: string;
  label: string;
  value: string;
}

export interface ButtonOption {
  name: string;
  label: string;
  icon: string;
  tooltip?: string;
  keyboard?: string[];
  action: () => void;
  isActive?: () => boolean | undefined;
  isDisabled?: () => boolean;
  value?: FontFamily["value"];
}

export interface Button {
  name: string;
  icon: string;
  tooltip: string;
  keyboard?: string[];
  action?: () => void;
  isActive?: () => boolean | undefined;
  isDisabled?: () => boolean;
  isDropdown?: boolean;
  options?: (ButtonOption | Button)[];
}

export interface ButtonGroup {
  name: string;
  buttons: Button[];
}

export type TiptapEditorType = ReturnType<typeof useEditor>;

type AsyncDataRequestStatus = "idle" | "pending" | "success" | "error";

interface AsyncDataExecuteOptions {
  dedupe?: "cancel" | "defer";
  timeout?: number;
  signal?: AbortSignal;
}

export type ProfileSettingsItem = {
  id: string | number;
  title: string;
  icon: string;
  description: string;
  buttonLabel: string;
  link: RouteLocationRaw;
};

export type SecuritySettingsItem = {
  id: string;
  label: string;
  value: string | number | boolean;
  icon: string;
  edit: boolean;
  link?: RouteLocationRaw;
};
export type Refresh = (opts?: AsyncDataExecuteOptions) => Promise<void>;
export type Status = AsyncDataRequestStatus;

export type FormFieldType = "select" | "checkbox" | "password" | "otp" | "email" | "text";

export type AuthFormField = {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  autocomplete?: string;
  required?: boolean;
};

export type NavItem = {
  label: string;
  to: RouteLocationRaw & RouteQueryAndHash;
  icon: string;
  id: string;
};

export type Allocation = typeof allocation.$inferSelect;
export type VisitorLog = typeof visitorLogs.$inferSelect;

// export type DB = ReturnType<typeof useDB>["db"];

export type UserMenuItem = DropdownMenuItem & {
  to?: RouteLocationRaw;
};

// eslint-disable-next-line ts/no-empty-object-type
export type ComponentType = string | ConcreteComponent<{}, any, any, ComputedOptions, MethodOptions, {}, any>;

export type VerificationToken = ReturnType<typeof randomUUID>;

export type AuthError = {
  errorCode: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  icon?: string;
};

export type RangeType = {
  start: Date;
  end: Date;
};

export type Notification = {
  id: number | string;
  unread?: boolean;
  sender: User;
  body: string;
  date: string;
};

export type Stat = {
  title: string;
  icon: string;
  value: number | string;
  variation: number;
  formatter?: (value: number) => string;
  color?: string;
};

export type Period = "daily" | "weekly" | "monthly" | "yearly";
export type ColorType = "primary" | "error" | "warning" | "info" | "success" | "neutral" | "secondary";
export type VariantType = "outline" | "soft" | "subtle" | "ghost" | "none";

export type StatsCard = {
  id: number | string;
  title: string;
  icon: string;
  color: ColorType;
  value: number | string;
  percentage?: number;
  period?: Period;
  to?: RouteLocationRaw;
};

export type Room = RoomType;

export type RoomInsert = typeof room.$inferInsert;

export type Hostel = typeof hostel.$inferInsert;

export type HostelFormData = DeepNonNullable<Omit<Hostel, "companyId">> & {
  logoFile?: File;
  logoKey?: string;
};

export type RoomDataResponse = {
  rooms: Room[];
  hostels: HostelData[];
} & AdminRoomStats;

export type StudentRoomData = Pick<RoomDataResponse, "rooms" | "hostels" | "totalRooms">;

export type UserDataResponse = {
  users: UserWithRelations[];
  stats: UserStats;
};

export type VisitorDataResponse = {
  visitors: Visitor[];
  stats: VisitorStats;

};

export type RoomDetailResponse = {
  room: Room;
};

export type StatusFilterOptions = {
  label: string;
  value: string;
}[];

export type StatusFilter = string | string;

export type BuildingFilter = string | string;
export type BuildingFilterOptions = {
  label: string;
  value: string;
}[];

export type FloorFilter = string | number;

export type FloorFilterOptions = ({
  label: string;
  value: number;
} | { label: string; value: string })[];

export type TableType<T> = Readonly<ShallowRef<ShallowUnwrapRef<{
  tableRef: Ref<HTMLTableElement | null, HTMLTableElement | null>;
  tableApi: Table<T>;
}> | null>>;

export type FilterOption = {
  label: string;
  value: string | number;
};

export type Student = typeof student.$inferSelect;

export type DashboardStudent = {
  student: StudentDashboard["studentRecordWithBestAllocation"];
  totalBilled: StudentDashboard["totalBilled"];
  totalPaid: StudentDashboard["totalPaid"];
  balance: StudentDashboard["outstandingBalance"];
  totalVisitors: StudentDashboard["totalVisitors"];
  pendingMaintenance: StudentDashboard["pendingMaintenanceCount"];
  rooms: RoomInHostel[];
};

export type StudentRoom = NonNullable<DashboardStudent["student"]["allocation"]>["room"];
export type Roommate = NonNullable<StudentRoom>["allocations"][number]["student"];

export type StudentVisitor = DashboardStudent["student"]["visitors"][number];
export type Admin = Omit<typeof admin.$inferSelect, "createdAt" | "updatedAt">;

export type AdminScope = {
  adminData: Admin;
  isPlatformAdmin: boolean;
  companyId: number | null;
  companyRole: "owner" | "admin" | "finance" | "support" | "staff" | null;
  hostelId?: number;
  userId: number;
  isActiveAdmin: boolean;
  companyMemberStatus?: "active" | "invited" | "disabled";
};

export type ScopeMode = "platform" | "company" | "hostel" | "none";

// export type UserType = {
//   student: Student | null;
//   admin?: Admin | null;
//   isEmailVerified: boolean;
//   hostelName?: string | null;
// } & Omit<User, "emailVerified">;

export type AdminUser = {
  name: string;
  email: string;
  role: "admin";
  phoneNumber: string;
  accessLevel: "regular" | "super" | "support" | "";
  department: string;
};

export type FailedAttempts = (typeof loginAttempts)["_"]["columns"][keyof (typeof loginAttempts)["_"]["columns"]];

export type VisitorType = Visitor;
export type VisitorStatus = Visitor["status"];
export type AllowedStatusesForCheckIn = Extract<VisitorStatus, "approved" | "checked-out">;

export type VisitorCreate = typeof visitor.$inferInsert;
export type InsertEditVisitor = Omit<EditVisitor["data"], "visitDate"> & { visitDate?: string };

export type MaintenanceCreate = typeof maintenanceRequest.$inferInsert;

export type MaintenanceEdit = {
  maintenanceId: number;
  studentId: number;
  data: Partial<MaintenanceCreate>;
};
export type MaintenanceType = Maintenance;
export type AdminMaintenanceDataResponse = {
  maintenanceRequests: Maintenance[];
  stats: MaintenanceStats;
};
export type MaintenanceDataResponse = {
  maintenanceRequests: StudentMaintenanceData["requests"];
  stats: StudentMaintenanceData["summary"];
};

export type MaintenanceStatus = typeof maintenanceStatusEnum["enumValues"][number];

export type MaintenanceAction = "change-status" | "add-response";

export type StatusResponseForm = Omit<MaintenanceStatusResponseSchema, "maintenanceId">;

export type DataType<T> = Ref<T, T>;

export type Complaint = ComplaintType;

export type ComplaintInsert = typeof complaint.$inferInsert;
export type EditComplaint = {
  complaintId: number;
  studentId: number;
  data: Partial<ComplaintInsert>;
};

export type ComplaintDataResponse = {
  complaints: Complaint[];
  stats: ComplaintData["summary"];
};

export type ComplaintAction = MaintenanceAction;

export type ComplaintStatusForm = Omit<ComplaintStatusResponseSchema, "complaintId">;
export type ComplaintStatus = typeof complaintStatusEnum["enumValues"][number];
export type ComplaintActionTaken = typeof complaintActionTakenEnum["enumValues"][number];

export type ComplaintFollowUp = Partial<Omit<ComplaintStatusResponseSchema, "status">>;

export type AnnouncementInsert = typeof announcement.$inferInsert;
export type Announcement = AnnouncementType;
export type AnnouncementResponse = {
  announcements: Announcement[];
};

type BaseUser = Omit<InferSelectModel<typeof user>, "password"
  | "verificationToken"
  | "verificationTokenExpiresAt"
  | "resetToken"
  | "resetTokenExpiresAt"
  | "lastLogin">;
type BaseStudent = InferSelectModel<typeof student>;
type BaseAdmin = InferSelectModel<typeof admin>;
type BaseAllocation = InferSelectModel<typeof allocation>;
type BaseRoom = InferSelectModel<typeof room>;
type BaseHostel = InferSelectModel<typeof hostel>;

type HostelData = BaseHostel;

type RoomWithHostel = BaseRoom & {
  hostel: HostelData | null;
};

type AllocationWithDetails = BaseAllocation & {
  room: RoomWithHostel | null;
};

type StudentWithDetails = BaseStudent & {
  allocation?: AllocationWithDetails | null;
};

type AdminWithDetails = BaseAdmin & {
  hostel: HostelData | null;
};

export type UserWithRelations = BaseUser & {
  student?: StudentWithDetails | null;
  admin?: AdminWithDetails | null;
};

export type RoomInHostel = Pick<BaseRoom, "id" | "roomNumber" | "floor">;

export type BillingInsert = typeof billing.$inferInsert;

export type BillingState = Partial<Omit<BillingInsert, "amount">> & { amount?: number };

export type Billing = BillingType;
export type BillingResponse = {
  billings: Billing[];
  stats: AdminBillingStats;
};

export type BillingDataResponseStudent = Omit<BillingResponse, "stats"> & {
  stats: StudentBillingStats;
};

export type PaystackStatus
  = "abandoned"
    | "failed"
    | "ongoing"
    | "pending"
    | "processing"
    | "queued"
    | "reversed"
    | "success"
    | "failed"
    | "abandoned";
export type DataRecord = { x: number | string; y: number | string | Date };

export interface AdminDashboardData {
  overview: Overview;
  cardStats: CardStats;
}

export interface CardStats {
  totalResidents: MonthlyRevenue;
  occupancyRate: AvailableBeds;
  availableBeds: AvailableBeds;
  monthlyRevenue: MonthlyRevenue;
}

export interface AvailableBeds {
  value: number;
  percentage: number;
  totalCapacity: number;
  totalOccupied?: number;
}

export interface MonthlyRevenue {
  value: number;
  percentage: number;
}

export interface Overview {
  occupancy: Occupancy;
  students: Students;
  finance: Finance;
  tasks: Tasks;
  visitors: Visitors;
  revenueTrend: RevenueTrend[];
}

export interface Finance {
  totalRevenue: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
}

export interface Occupancy {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  totalCapacity: number;
  currentOccupancy: number;
  rate: number;
}

export interface RevenueTrend {
  month: string;
  amount: number;
}

export interface Students {
  total: number;
  active: number;
  males: number;
  females: number;
}

export interface Tasks {
  pendingComplaints: number;
  inProgressComplaints: number;
  pendingMaintenance: number;
  inProgressMaintenance: number;
  criticalMaintenance: number;
}

export interface Visitors {
  active: number;
  pending: number;
}

export type CardStatsScope = {
  companyId: number | null;
  hostelId: number | null;
  isPlatformAdmin: boolean;
  companyRole: AdminScope["companyRole"] | null;
};

export type OverviewAdminScope = {
  accessLevel: Admin["accessLevel"];
  hostelId: number | null;
  companyId: number | null;
  isPlatformAdmin: boolean;
  companyRole: AdminScope["companyRole"] | null;
};

export type NotificationDTO = {
  id: string;
  title: string;
  message: string;
  type: "maintenance" | "complaint" | "visitor";
  sender: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  };
  isRead: boolean; // will become real when we add notification_read table
  link: { name: string; query: Record<string, any> };
  createdAt: Date;
};

export type AuthLoginCode
  = | "LOGIN_SUCCESS"
    | "ADMIN_LOGIN"
    | "WRONG_PORTAL";

export type AuthLoginResponse = {
  success: boolean;
  code: AuthLoginCode;
  message: string;
  nextUrl: string;
};

export type StudentStatusResponse = {
  success: boolean;
  hasProfile: boolean;
  hasActiveBooking: boolean;
  studentId?: number;
  student: Student | null;
};

export type PostLoginResponse
  = | { success: true; nextUrl: "/admin/dashboard" }
    | { success: true; nextUrl: "/auth/onboarding" }
    | { success: true; nextUrl: "/auth/hostelHub" }
    | { success: true; nextUrl: "/student/dashboard" };

export interface StudentHostel {
  id: number;
  name: string;
  slug: string;
  address: string;
  logoUrl: string | null;
  status: "active" | "inactive" | "under renovation";
  companyId: number;
  joinCode: string | null;
  minimumRoomPrice: number;
  maximumRoomPrice: number;
  availableRooms: number;
  totalCapacity: number;
  currentOccupancy: number;
  roomTypes: string[];
}

export interface HostelSearchResult {
  id: number;
  name: string;
  slug: string;
  address: string;
  logoUrl: string | null;
  availableRooms: number;
  status: "active" | "inactive" | "under renovation";
  companyId: number;
  companyName: string;
}

export interface HostelDetails extends StudentHostel {
  supportEmail: string | null;
  supportPhone: string | null;
  rooms: HostelRoom[];
}

export type HostelRoom = HostelRoomType;

export interface HostelDetailsResponse {
  hostel: Omit<StudentHostel, "minimumRoomPrice" | "maximumRoomPrice" | "totalCapacity" | "currentOccupancy" | "availableRooms" | "roomTypes">;
  rooms: HostelRoom[];
  stats: {
    totalRooms: number;
    availableRooms: number;
    minimumPrice: number;
    maximumPrice: number;
  };
  roomTypes: string[];
  studentGender: "male" | "female";
}

export type UseSessionEvent = Parameters<typeof useSession>[0];

type Prettify<T> = {
  [K in keyof T]: T[K]
};

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
};

type GetIndexSignature<T> = {
  [K in keyof T as string extends K ? K : never]: T[K]
};

// Basic Omit but does not break if a [x:string]:unknown Index Signature is present in the type
export type OmitWithIndexSignature<T extends Record<string, unknown>, K extends keyof RemoveIndexSignature<T>> = Prettify<Omit<RemoveIndexSignature<T>, K> & GetIndexSignature<T>>;

export type TenantBranding = {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
};

export type MediaAttachment = z.output<typeof mediaAttachmentSchema>;

export interface FileValidationOptions {
  allowedMimeTypes?: Record<string, MediaAttachment["type"]>;
  maxSizePerFile?: number;
  maxTotalFiles?: number;
}

export type EditFormState = Partial<CreateMaintenanceSchema> & { existingMedia?: MediaAttachment[] };

export type HostelHub = PaginatedHostel;
