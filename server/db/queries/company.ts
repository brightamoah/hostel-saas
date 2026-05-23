import type { AdminScope, AuditContext } from "~~/shared/types";

import { getActorLabel } from "~~/server/utils/auditLogUtils";
import { and, count, eq, sql } from "drizzle-orm";

import { admin, company, companyMember, hostel, room, student, user } from "../schema";
import { auditLogQueries } from "./auditLog";

export async function companyQueries() {
  const { db } = useDB();
  const { logAudit } = await auditLogQueries();

  const applyCompanyScopeSql = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(company.id, scope.companyId)];
    return [sql`FALSE`];
  };

  const applyCompanyScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return {};
    if (mode === "company" && scope.companyId) return { id: scope.companyId };
    return { RAW: () => sql`FALSE` };
  };

  const getScopedCompanyProfile = async (scope: AdminScope) => {
    return await db.query.company.findFirst({
      where: {
        ...applyCompanyScope(scope),
      },
      with: {
        hostels: true,
      },
    });
  };

  const updateCompanyProfile = async (
    scope: AdminScope,
    data: Partial<typeof company.$inferInsert>,
    ctx: AuditContext,
  ) => {
    if (!canManageCompanySettings(scope)) {
      throw createError({
        statusCode: 403,
        message: "Only company owners can update company settings.",
      });
    }

    const before = await db
      .query
      .company
      .findFirst({
        where: {
          ...applyCompanyScope(scope),
        },
      });

    const [updated] = await db
      .update(company)
      .set({ ...data, updatedAt: new Date() })
      .where(and(...applyCompanyScopeSql(scope)))
      .returning();

    if (updated && before) {
      await logAudit(db, ctx, {
        action: "company.update",
        actionType: "UPDATE",
        entityId: updated.id,
        entityType: "company",
        description: `${getActorLabel(ctx)} updated company profile for ID ${updated.id}`,
        before,
        after: updated,
        diff: computeAuditDiff(redact(before), redact(updated)),
      });
    }

    return updated;
  };

  const getCompanyStats = async (scope: AdminScope) => {
    const filters = applyCompanyScopeSql(scope);

    const [stats] = await db
      .select({
        hostelCount: count(hostel.id),

        studentCount: sql<number>`(SELECT count(*) FROM ${student} WHERE ${student.companyId} = ${company.id})`,
        roomCount: sql<number>`(SELECT count(*) FROM ${room} WHERE ${room.companyId} = ${company.id})`,
      })
      .from(company)
      .leftJoin(hostel, eq(hostel.companyId, company.id))
      .where(and(...filters))
      .groupBy(company.id);

    return stats || { hostelCount: 0, studentCount: 0, roomCount: 0 };
  };

  const getCompanyMembers = async (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "hostel") {
      return await db
        .select()
        .from(companyMember)
        .innerJoin(admin, eq(admin.userId, companyMember.userId))
        .innerJoin(user, eq(user.id, companyMember.userId))
        .where(and(
          eq(companyMember.companyId, scope.companyId!),
          eq(admin.hostelId, scope.hostelId!),
        ));
    }

    return await db.query.companyMember.findMany({
      where: {
        AND: [
          {
            companyId: scope.companyId!,
          },
        ],
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  };

  const registerCompanyOwner = async (
    data: RegisterCompanySchema & {
      verificationToken: string;
      verificationTokenExpiresAt: Date;
    },
    ctx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      const existingUser = await tx.query.user.findFirst({
        where: {
          email: data.email,
        },
        columns: {
          id: true,
        },
      });

      if (existingUser) {
        throw createError({
          statusCode: 400,
          message: "Email already exists. Please use a different email.",
        });
      }

      const existingCompany = await tx.query.company.findFirst({
        where: {
          slug: data.companySlug,
        },
        columns: {
          id: true,
        },
      });

      if (existingCompany) {
        throw createError({
          statusCode: 400,
          message: "Company slug is already taken.",
        });
      }

      const [createdUser] = await tx.insert(user).values({
        email: data.email,
        password: data.password,
        name: data.name,
        role: "admin",
        emailVerified: false,
        verificationToken: data.verificationToken,
        verificationTokenExpiresAt: data.verificationTokenExpiresAt,
      }).returning();

      if (!createdUser) {
        throw createError({
          statusCode: 500,
          message: "Failed to create user. Please try again.",
        });
      }

      const [createdCompany] = await tx.insert(company).values({
        name: data.companyName,
        slug: data.companySlug,
        status: "active",
      }).returning();

      if (!createdCompany) {
        throw createError({
          statusCode: 500,
          message: "Failed to create company. Please try again.",
        });
      }

      const ctxWithCompany: AuditContext = {
        ...ctx,
        companyId: createdCompany.id,
        hostelId: null,
      };

      await logAudit(tx, ctxWithCompany, {
        action: "company.create",
        actionType: "CREATE",
        entityType: "company",
        entityId: createdCompany.id,
        description: `${getActorLabel(ctxWithCompany)} registered new company "${createdCompany.name}"`,
        before: null,
        after: createdCompany,
      });

      let createdHostel: typeof hostel.$inferSelect | null = null;

      let auditCtx: AuditContext = ctxWithCompany;

      if (data.createHostelNow) {
        const {
          hostelName,
          hostelSlug,
          supportEmail,
          supportPhone,
          hostelAddress,
          hostelLogoUrl,
        } = data;

        if (!hostelName || !hostelSlug || !hostelLogoUrl) {
          throw createError({
            statusCode: 400,
            message: "Hostel name, slug and logoUrl are required to create a hostel.",
          });
        }

        if (!hostelAddress) {
          throw createError({
            statusCode: 400,
            message: "Hostel address is required to create a hostel.",
          });
        }

        if (!supportEmail || !supportPhone) {
          throw createError({
            statusCode: 400,
            message: "Support email and phone are required to create a hostel.",
          });
        }

        const existingHostel = await tx.query.hostel.findFirst({
          where: {
            slug: hostelSlug,
          },
          columns: { id: true },
        });

        if (existingHostel) {
          throw createError({
            statusCode: 400,
            message: "Hostel slug is already taken.",
          });
        }

        const [newHostel] = await tx.insert(hostel).values({
          companyId: createdCompany.id,
          address: hostelAddress,
          contactNumber: supportPhone,
          email: supportEmail,
          name: hostelName,
          slug: hostelSlug,
          status: "active",
          supportEmail,
          supportPhone,
          logoUrl: hostelLogoUrl,
        }).returning();

        createdHostel = newHostel ?? null;

        if (createdHostel) {
          auditCtx = {
            ...ctxWithCompany,
            hostelId: createdHostel.id,
          };

          await logAudit(tx, auditCtx, {
            action: "hostel.create",
            actionType: "CREATE",
            entityType: "hostel",
            entityId: createdHostel.id,
            description: `${getActorLabel(auditCtx)} created initial hostel "${createdHostel.name}" during company registration`,
            before: null,
            after: createdHostel,
          });
        }
      }

      if (!createdHostel && data.createHostelNow) {
        throw createError({
          statusCode: 500,
          message: "Failed to create hostel. Please try again.",
        });
      }

      const [createdAdmin] = await tx.insert(admin).values({
        userId: createdUser.id,
        companyId: createdCompany.id,
        department: "Owner",
        phoneNumber: data.phoneNumber,
        accessLevel: "regular", // company owners aren't "platform super"
        hostelId: createdHostel?.id,
        status: "active",
      }).returning();

      if (!createdAdmin) {
        throw createError({
          statusCode: 500,
          message: "Failed to create admin record. Please try again.",
        });
      }

      const [createdMembership] = await tx.insert(companyMember).values({
        companyId: createdCompany.id,
        userId: createdUser.id,
        role: "owner",
        status: "active",
      }).returning();

      if (!createdMembership) {
        throw createError({
          statusCode: 500,
          message: "Failed to create company membership. Please try again.",
        });
      }

      await logAudit(tx, auditCtx, {
        action: "admin.create",
        actionType: "CREATE",
        entityType: "admin",
        entityId: createdAdmin.id,
        description: `${getActorLabel(auditCtx)} created admin record for owner user ID ${createdUser.id} in company ID ${createdCompany.id}`,
        before: null,
        after: createdAdmin,
      });

      await logAudit(tx, auditCtx, {
        action: "companyMember.create",
        actionType: "CREATE",
        entityType: "company_member",
        entityId: createdMembership.id,
        description: `${getActorLabel(auditCtx)} created company membership for owner user ID ${createdUser.id} in company ID ${createdCompany.id}`,
        before: null,
        after: createdMembership,
      });

      return {
        user: createdUser,
        company: createdCompany,
        admin: createdAdmin,
        membership: createdMembership,
        hostel: createdHostel,
      };
    });
  };

  const getUserMembershipByUserId = async (userId: number) => {
    const membership = await db.query.companyMember.findFirst({
      where: {
        userId,
      },
      columns: {
        id: true,
        companyId: true,
        role: true,
        status: true,
      },
    });

    return membership;
  };

  return {
    registerCompanyOwner,
    getUserMembershipByUserId,
    getScopedCompanyProfile,
    updateCompanyProfile,
    getCompanyStats,
    getCompanyMembers,
  };
}
