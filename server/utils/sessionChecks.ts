import type { H3Event } from "h3";

export async function adminSessionCheck(event: H3Event): Promise<AdminScope & { session: Awaited<ReturnType<typeof requirePortalUserSession>> }> {
  const session = await requirePortalUserSession(event, {
    message: "You must be logged in as an admin to access this resource.",
  });

  const user = session.user;

  if (
    user?.adminData?.status !== "active"
  ) {
    throw createError({
      statusCode: 403,
      message: "Access denied: Must be a verified active admin.",
    });
  }

  const adminData = user.adminData;
  const isPlatformAdmin = adminData.accessLevel === "super";

  if (isPlatformAdmin) {
    return {
      isActiveAdmin: true,
      adminData,
      userId: user.id,
      isPlatformAdmin: true,
      companyId: null,
      companyRole: null,
      companyMemberStatus: undefined,
      hostelId: undefined,
      session,
    };
  }

  const { db } = useDB();

  const membership = await db.query.companyMember.findFirst({
    where: {
      userId: user.id,
    },
    columns: {
      companyId: true,
      role: true,
      status: true,
    },
  });

  if (!membership || membership.status !== "active") {
    throw createError({
      statusCode: 403,
      message: "Access denied: Admin is not assigned to an active company.",
    });
  }

  return {
    isActiveAdmin: true,
    adminData,
    userId: user.id,
    isPlatformAdmin: false,
    companyId: membership.companyId,
    companyRole: membership.role,
    companyMemberStatus: membership.status,
    hostelId: adminData.hostelId ?? undefined,
    session,
  };
}

export async function studentSessionCheck(event: H3Event): Promise<{
  isActiveStudent: true;
  userId: number;
  studentId: number;
  companyId?: number;
  user: NonNullable<Awaited<ReturnType<typeof requirePortalUserSession>>["user"]>;
  session: Awaited<ReturnType<typeof requirePortalUserSession>>;
}> {
  const session = await requirePortalUserSession(event);
  const studentId = session.user?.studentId;

  if (
    session.user.role !== "student"
    || typeof studentId !== "number"
  ) {
    throw createError({
      statusCode: 403,
      message: "Forbidden: This endpoint is only accessible to students.",
    });
  }

  return {
    isActiveStudent: true,
    userId: session.user.id,
    studentId,
    companyId: session.user.companyId,
    user: session.user,
    session,
  };
}
