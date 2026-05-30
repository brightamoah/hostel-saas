/**
 * Asserts the admin has at least one of the allowed company roles.
 * Platform admins (isPlatformAdmin) always pass.
 *
 * Usage:
 *   requireCompanyRole(scope, ["owner"])             // owner only
 *
 *   requireCompanyRole(scope, ["owner", "admin"])    // owner or admin
 *
 * @throws 403 createError if the role requirement is not met.
 */
export function requireCompanyRole(
  scope: AdminScope,
  allowedRoles: Array<"owner" | "admin" | "finance" | "support" | "staff">,
) {
  if (scope.isPlatformAdmin) return;

  if (!scope.companyRole || !allowedRoles.includes(scope.companyRole as typeof allowedRoles[number])) {
    throw createError({
      statusCode: 403,
      message: `Access denied: requires one of [${allowedRoles.join(", ")}] role.`,
    });
  }
}

/**
 * Asserts the admin's scope covers the given companyId.
 * Prevents a company admin from touching another company's settings.
 *
 * @throws 403 createError if the company does not match.
 */
export function requireCompanyScope(scope: AdminScope, companyId: number): void {
  if (scope.isPlatformAdmin) return;

  if (scope.companyId !== companyId) {
    throw createError({
      statusCode: 403,
      message: "Access denied: you do not belong to this company.",
    });
  }
}

/**
 * Asserts the admin's scope covers the given hostelId.
 * Super-admins and company owners pass regardless of hostel assignment.
 *
 * @throws 403 createError if the hostel does not match.
 */
export function requireHostelScope(
  scope: AdminScope,
  hostelCompanyId: number,
  hostelId: number,
): void {
  if (scope.isPlatformAdmin) return;

  requireCompanyScope(scope, hostelCompanyId);

  if (scope.companyRole === "owner") return;

  if (scope.hostelId !== hostelId) {
    throw createError({
      statusCode: 403,
      message: "Access denied: you are not assigned to this hostel.",
    });
  }
}
