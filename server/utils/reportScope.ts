import type { H3Event } from "h3";

export function resolveReportScope(event: H3Event, scope: AdminScope): AdminScope {
  const query = getQuery(event);
  const resolvedScope = { ...scope };

  if (resolvedScope.isPlatformAdmin) {
    resolvedScope.companyId = query.companyId ? Number(query.companyId) : null;
    resolvedScope.hostelId = query.hostelId ? Number(query.hostelId) : undefined;
  }
  else if (resolvedScope.companyRole === "owner") {
    resolvedScope.hostelId = query.hostelId ? Number(query.hostelId) : undefined;
  }

  return resolvedScope;
}
