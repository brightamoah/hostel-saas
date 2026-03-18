import type { AdminScope, ScopeMode } from "~~/shared/types";

export function getScopeMode(scope: AdminScope): ScopeMode {
  if (scope.isPlatformAdmin) return "platform";
  if (scope.companyRole === "owner") return "company";
  if (scope.hostelId) return "hostel";
  return "none";
}

export function canManageAdmins(scope: AdminScope) {
  return scope.isPlatformAdmin || scope.companyRole === "owner";
}

export function canManageBilling(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "finance"].includes(scope.companyRole ?? "");
}

export function canManageHostels(scope: AdminScope) {
  return scope.isPlatformAdmin || scope.companyRole === "owner";
}

export function canManageRooms(scope: AdminScope) {
  return scope.isPlatformAdmin || scope.companyRole === "owner" || scope.companyRole === "admin";
}

export function canManageComplaints(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "support"].includes(scope.companyRole ?? "") || !!scope.hostelId;
}

export function canManageMaintenance(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "support"].includes(scope.companyRole ?? "") || !!scope.hostelId;
}

export function canManageStudents(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "support"].includes(scope.companyRole ?? "") || !!scope.hostelId;
}

export function canViewReports(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "finance"].includes(scope.companyRole ?? "") || !!scope.hostelId;
}

export function canManageCompanySettings(scope: AdminScope) {
  return scope.isPlatformAdmin || scope.companyRole === "owner";
}

export function canManageHostelSettings(scope: AdminScope) {
  return scope.isPlatformAdmin || scope.companyRole === "owner";
}

export function canManageOwnProfile(scope: AdminScope) {
  return scope.isActiveAdmin;
}

export function canManageSupport(scope: AdminScope) {
  return scope.isPlatformAdmin || ["owner", "admin", "support"].includes(scope.companyRole ?? "") || !!scope.hostelId;
}

export function isCompanyOwner(scope: AdminScope) {
  return scope.companyRole === "owner";
}

export function isSuperAdmin(scope: AdminScope) {
  return scope.isPlatformAdmin;
}
