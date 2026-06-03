import type { AdminScope, FailedAttempts, Period, StudentInsert } from "~~/shared/types";
import type { SQL } from "drizzle-orm";
import type { H3Event } from "h3";

import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { canManageAdmins, getScopeMode } from "~~/server/utils/permissionScope";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import {
  admin,
  allocation,
  billing,
  loginAttempts,
  maintenanceRequest,
  room,
  student,
  user,
  visitor,
} from "../schema";

const ATTEMPT_WINDOW_MINUTES = 15;
type Allocation = typeof allocation.$inferSelect;

const userWithRelations = {
  columns: {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
    emailVerified: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    student: {
      with: {
        allocations: {
          with: {
            room: {
              with: {
                hostel: true,
              },
            },
          },
        },
      },
    },
    admin: {
      with: {
        hostel: true,
      },
    },
  },
} as const;

const today = new Date().toISOString();

const studentWithRelations = {
  with: {
    user: {
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        lastLogin: true,
      },
    },
    allocations: {
      with: {
        room: {
          with: {
            hostel: true,
            allocations: {
              with: {
                student: {
                  columns: {
                    id: true,
                    residencyStatus: true,
                    phoneNumber: true,
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
                },
              },
            },
          },
        },
      },
    },
    billings: true,
    payments: true,
    maintenanceRequests: true,
    complaints: true,
    visitors: {
      where: { visitDate: today },
      orderBy: { visitDate: "desc" },
      with: {
        visitorLogs: {
          orderBy: { timestamp: "desc" },
          with: {
            admin: {
              columns: {},
              with: {
                user: {
                  columns: {
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const bestAllocationWithRelations = {
  with: {
    room: {
      with: {
        hostel: true,
        allocations: {
          with: {
            student: {
              columns: {
                id: true,
                residencyStatus: true,
                phoneNumber: true,
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
            },
          },
        },
      },
    },
  },
} as const;

export async function userQueries(event?: H3Event) {
  const { db } = useDB(event);

  const applyAdminTableScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return {};
    if (mode === "company") return { companyId: scope.companyId! };
    if (mode === "hostel") return { hostelId: scope.hostelId! };
    return { RAW: () => sql`FALSE` };
  };

  const applyAdminTableScopeSql = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];
    if (mode === "company") return [eq(admin.companyId, scope.companyId!)];
    if (mode === "hostel") return [eq(admin.hostelId, scope.hostelId!)];
    return [sql`FALSE`];
  };

  const applyStudentTableScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];
    if (mode === "company") return [eq(student.companyId, scope.companyId!)];
    if (mode === "hostel") {
      // Logic: Students assigned to rooms in the admin's hostel
      return [
        exists(
          db
            .select()
            .from(allocation)
            .innerJoin(room, eq(allocation.roomId, room.id))
            .where(and(eq(allocation.studentId, student.id), eq(room.hostelId, scope.hostelId!))),
        ),
      ];
    }
    return [sql`FALSE`];
  };

  /**
   * Updates the `lastLogin` field for a user to the current date and time.
   * @async
   * @param userId The ID of the user to update.
   * @returns A promise that resolves when the user's last login has been successfully updated.
   */
  async function updateUserLastLogin(userId: number) {
    await db
      .update(user)
      .set({
        lastLogin: new Date(),
      })
      .where(eq(user.id, userId));
  }

  const getUserByEmail = async (email: string) => {
    const existingUser = await db.query.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
    return existingUser;
  };

  const getUserById = async (id: number) => {
    const existingUser = await db.query.user.findFirst({
      where: { id },
    });
    return existingUser;
  };

  const getStudentIdByUserId = async (userId: number) => {
    const studentRecord = await db.query.student.findFirst({
      where: { userId },
      columns: { id: true },
    });
    return studentRecord;
  };

  async function cleanupExpiredVerificationTokens() {
    const now = new Date();

    const result = await db
      .update(user)
      .set({
        verificationToken: null,
        verificationTokenExpiresAt: null,
      })
      .where(and(isNotNull(user.verificationToken), lt(user.verificationTokenExpiresAt, now)));
    return result;
  }

  const getFailedAttemptsCount = async (
    filteredField: FailedAttempts,
    filteredValue: string | number,
  ): Promise<number> => {
    const windowStartTimestamp = Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000;

    const [result] = await db
      .select({ value: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(filteredField, filteredValue),
          eq(loginAttempts.success, false),
          gt(loginAttempts.timestamp, new Date(windowStartTimestamp)),
        ),
      );

    return result?.value ?? 0;
  };

  const recordLoginAttempt = async (
    userId: number | null,
    ip: string,
    success = false,
  ): Promise<void> => {
    await db.insert(loginAttempts).values({
      userId,
      ip,
      timestamp: new Date(),
      success,
    });
  };

  const getStudentByUserId = async (id: number) => {
    const existingStudent = await db.query.student.findFirst({
      where: { userId: id },
    });
    return existingStudent;
  };

  const getOnboardedStudent = async (id: number) => {
    const existingStudent = await db.query.student.findFirst({
      where: { userId: id },
    });
    return existingStudent;
  };

  const getUsers = async (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    const { startOfToday, startOfThisWeek, startOfThisMonth } = getTimePeriod();

    const getUserFilterRaw = (table: Pick<typeof user, "id">): SQL<unknown> => {
      if (mode === "platform") return sql`TRUE`;

      return sql`
      EXISTS (
        SELECT 1 FROM ${admin}
        WHERE ${and(eq(admin.userId, table.id), ...applyAdminTableScopeSql(scope))}
      ) OR EXISTS (
        SELECT 1 FROM ${student}
        WHERE ${and(eq(student.userId, table.id), ...applyStudentTableScope(scope))}
      )
    `;
    };

    const [users, [stat]] = await Promise.all([
      db.query.user.findMany({
        where: {
          RAW: table => getUserFilterRaw(table),
        },
        extras: {
          companyName: (user, { sql }) => sql`(
            COALESCE(
              (SELECT name FROM company WHERE id = (SELECT company_id FROM student WHERE user_id = ${user.id} LIMIT 1)),
              (SELECT name FROM company WHERE id = (SELECT company_id FROM admin WHERE user_id = ${user.id} LIMIT 1)),
              'Platform Global'
            )
          )`,
        },
        orderBy: { id: "asc" },
        ...userWithRelations,
      }),

      db
        .select({
          totalNow: count(user.id),
          totalPrevMonth: count(sql`CASE WHEN ${user.createdAt} < ${startOfThisMonth} THEN 1 END`),

          studentsNow: count(sql`CASE WHEN ${user.role} = 'student' THEN 1 END`),
          studentsPrevMonth: count(
            sql`CASE WHEN ${user.role} = 'student' AND ${user.createdAt} < ${startOfThisMonth} THEN 1 END`,
          ),

          adminsNow: count(sql`CASE WHEN ${user.role} = 'admin' THEN 1 END`),
          adminsPrevWeek: count(
            sql`CASE WHEN ${user.role} = 'admin' AND ${user.createdAt} < ${startOfThisWeek} THEN 1 END`,
          ),

          activeNow: count(
            sql`CASE WHEN ${user.role} = 'student' AND ${student.residencyStatus} = 'active' THEN 1 END`,
          ),
          activeNotUpdatedToday: count(
            sql`CASE WHEN ${user.role} = 'student' AND ${student.residencyStatus} = 'active' AND ${student.updatedAt} < ${startOfToday} THEN 1 END`,
          ),
        })
        .from(user)
        .leftJoin(student, eq(student.userId, user.id))
        .where(getUserFilterRaw(user)),
    ]);

    return {
      users,
      stats: {
        totalUsers: {
          value: Number(stat?.totalNow),
          percentage: calcChange(Number(stat?.totalNow), Number(stat?.totalPrevMonth)),
          period: "monthly" as Period,
        },
        totalStudents: {
          value: Number(stat?.studentsNow),
          percentage: calcChange(Number(stat?.studentsNow), Number(stat?.studentsPrevMonth)),
          period: "monthly" as Period,
        },
        totalAdmins: {
          value: Number(stat?.adminsNow),
          percentage: calcChange(Number(stat?.adminsNow), Number(stat?.adminsPrevWeek)),
          period: "weekly" as Period,
        },
        activeStudents: {
          value: Number(stat?.activeNow),
          percentage: calcChange(Number(stat?.activeNow), Number(stat?.activeNotUpdatedToday)),
          period: "daily" as Period,
        },
      },
    };
  };

  // const getUsers = async (scope: AdminScope) => {
  //   const mode = getScopeMode(scope);

  //   const { startOfToday, startOfThisWeek, startOfThisMonth } = getTimePeriod();

  //   const userFilter
  //     = mode === "platform"
  //       ? sql`TRUE`
  //       : or(
  //           exists(
  //             db
  //               .select()
  //               .from(admin)
  //               .where(and(eq(admin.userId, user.id), ...applyAdminTableScopeSql(scope))),
  //           ),
  //           exists(
  //             db
  //               .select()
  //               .from(student)
  //               .where(and(eq(student.userId, user.id), ...applyStudentTableScope(scope))),
  //           ),
  //         );

  //   const [users, [stat]] = await Promise.all([
  //     db.query.user.findMany({
  //       where: {
  //         RAW: userFilter,
  //       },
  //       orderBy: { id: "asc" },
  //       ...userWithRelations,
  //     }),

  //     db
  //       .select({
  //         totalNow: count(user.id),
  //         totalPrevMonth: count(sql`CASE WHEN ${user.createdAt} < ${startOfThisMonth} THEN 1 END`),

  //         studentsNow: count(sql`CASE WHEN ${user.role} = 'student' THEN 1 END`),
  //         studentsPrevMonth: count(
  //           sql`CASE WHEN ${user.role} = 'student' AND ${user.createdAt} < ${startOfThisMonth} THEN 1 END`,
  //         ),

  //         adminsNow: count(sql`CASE WHEN ${user.role} = 'admin' THEN 1 END`),
  //         adminsPrevWeek: count(
  //           sql`CASE WHEN ${user.role} = 'admin' AND ${user.createdAt} < ${startOfThisWeek} THEN 1 END`,
  //         ),

  //         activeNow: count(
  //           sql`CASE WHEN ${user.role} = 'student' AND ${student.residencyStatus} = 'active' THEN 1 END`,
  //         ),
  //         activeNotUpdatedToday: count(
  //           sql`CASE WHEN ${user.role} = 'student' AND ${student.residencyStatus} = 'active' AND ${student.updatedAt} < ${startOfToday} THEN 1 END`,
  //         ),
  //       })
  //       .from(user)
  //       .leftJoin(student, eq(student.userId, user.id))
  //       .where(userFilter),
  //   ]);

  //   return {
  //     users,
  //     stats: {
  //       totalUsers: {
  //         value: Number(stat?.totalNow),
  //         percentage: calcChange(Number(stat?.totalNow), Number(stat?.totalPrevMonth)),
  //         period: "monthly" as Period,
  //       },
  //       totalStudents: {
  //         value: Number(stat?.studentsNow),
  //         percentage: calcChange(Number(stat?.studentsNow), Number(stat?.studentsPrevMonth)),
  //         period: "monthly" as Period,
  //       },
  //       totalAdmins: {
  //         value: Number(stat?.adminsNow),
  //         percentage: calcChange(Number(stat?.adminsNow), Number(stat?.adminsPrevWeek)),
  //         period: "weekly" as Period,
  //       },
  //       activeStudents: {
  //         value: Number(stat?.activeNow),
  //         percentage: calcChange(Number(stat?.activeNow), Number(stat?.activeNotUpdatedToday)),
  //         period: "daily" as Period,
  //       },
  //     },
  //   };
  // };

  const getTotalStudents = async () => {
    const count = await db.query.user
      .findMany({
        where: {
          role: "student",
        },
      })
      .then(students => students.length);
    return count;
  };

  const getTotalAdmins = async () => {
    const count = await db.query.admin.findMany().then(admins => admins.length);
    return count;
  };

  const getActiveStudentsCount = async () => {
    const count = await db.query.student.findMany({
      where: {
        residencyStatus: "active",
      },
    });
    return count.length;
  };

  const getAdminByUserId = async (userId: number, activeOnly = false, scope: AdminScope) => {
    return await db.query.admin.findFirst({
      where: {
        AND: [
          { userId },
          activeOnly ? { status: "active" } : { RAW: () => sql`TRUE` },
          { ...applyAdminTableScope(scope) },
        ],
      },
    });
  };

  const getAdminByUserIdUnscoped = async (userId: number, activeOnly = false) => {
    return await db.query.admin.findFirst({
      where: {
        AND: [{ userId }, activeOnly ? { status: "active" } : { RAW: () => sql`TRUE` }],
      },
    });
  };

  const checkIfUserExists = async (email: string): Promise<boolean> => {
    const existingUser = await db.query.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
    return !!existingUser;
  };

  const deleteUsersByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];

    const deletedUsers = await db.delete(user).where(inArray(user.id, ids)).returning();

    return deletedUsers;
  };

  const getUserByIds = async (ids: number[]) => {
    const users = await db
      .select({
        id: user.id,
        role: user.role,
        admin: {
          id: admin.id,
          accessLevel: admin.accessLevel,
        },
        student: {
          id: student.id,
          residencyStatus: student.residencyStatus,
          allocation: sql<Allocation>`
            json_build_object(
              'id', ${allocation.id},
              'status', ${allocation.status},
              'roomId', ${allocation.roomId}
            )
          `.as("allocation"),
        },
      })
      .from(user)
      .leftJoin(admin, eq(admin.userId, user.id))
      .leftJoin(student, eq(student.userId, user.id))
      .leftJoin(allocation, eq(allocation.studentId, student.id))
      .where(inArray(user.id, ids));

    return users;
  };

  const createOrUpdateAdminForUser = async (
    userId: number,
    payload: {
      phoneNumber?: string;
      department?: string;
      accessLevel?: "regular" | "super" | "support";
      hostelId?: number | null;
      companyId?: number | null;
    },
    scope: AdminScope,
  ) => {
    if (!canManageAdmins(scope)) {
      throw createError({
        statusCode: 403,
        message: "Unauthorized to manage admins",
      });
    }

    return await db.transaction(async (tx) => {
      const existingAdmin = await tx.query.admin.findFirst({
        where: { userId },
      });

      if (
        existingAdmin
        && getScopeMode(scope) !== "platform"
        && existingAdmin.companyId !== scope.companyId
      ) {
        throw new Error("Target user is outside your company scope");
      }

      const values = {
        userId,
        phoneNumber: payload.phoneNumber!,
        department: payload.department!,
        accessLevel: payload.accessLevel!,
        hostelId: payload.hostelId!,
        companyId: scope.isPlatformAdmin ? payload.companyId! : scope.companyId!,
        status: "active" as const,
      };

      const [result] = existingAdmin
        ? await tx.update(admin).set(values).where(eq(admin.id, existingAdmin.id)).returning()
        : await tx.insert(admin).values(values).returning();

      await tx.update(user).set({ role: "admin" }).where(eq(user.id, userId));
      return result;
    });
  };

  const disableAdminByUserId = async (userId: number) => {
    return await db.transaction(async (tx) => {
      const [demotedAdmin] = await tx
        .update(admin)
        .set({ status: "inactive" })
        .where(eq(admin.userId, userId))
        .returning();

      if (!demotedAdmin) return null;

      await tx.update(user).set({ role: "student" }).where(eq(user.id, userId));

      return demotedAdmin;
    });
  };

  const getStudentForDashboardByUserId = async (userId: number) => {
    const studentRecord = await db.query.student.findFirst({
      where: { userId },
      ...studentWithRelations,
    });

    if (!studentRecord) return null;

    const studentId = studentRecord.id;

    const bestAllocation = await db.query.allocation.findFirst({
      where: { studentId },
      orderBy: allocation => [
        asc(sql`CASE WHEN ${allocation.status} IN ('active', 'pending') THEN 1 ELSE 2 END`),
        desc(allocation.allocationDate),
        desc(allocation.id),
      ],
      ...bestAllocationWithRelations,
    });

    const studentRecordWithBestAllocation = {
      ...studentRecord,
      allocation: bestAllocation,
    };

    const [[billingStats], [maintenanceStats], [visitorStats]] = await Promise.all([
      db
        .select({
          totalBilled: sql<string>`coalesce(sum(${billing.amount}), '0')`,
          totalPaid: sql<string>`coalesce(sum(${billing.paidAmount}), '0')`,
        })

        .from(billing)
        .where(and(eq(billing.studentId, studentId), ne(billing.status, "cancelled"))),

      db
        .select({ count: count() })
        .from(maintenanceRequest)
        .where(
          and(
            eq(maintenanceRequest.studentId, studentId),
            eq(maintenanceRequest.status, "pending"),
          ),
        ),

      db.select({ count: count() }).from(visitor).where(eq(visitor.studentId, studentId)),
    ]);

    const totalBilled = Number.parseFloat(billingStats?.totalBilled || "0");
    const totalPaid = Number.parseFloat(billingStats?.totalPaid || "0");
    const outstandingBalance = totalBilled - totalPaid;

    const pendingMaintenanceCount = maintenanceStats?.count || 0;

    const totalVisitors = visitorStats?.count || 0;

    return {
      studentRecordWithBestAllocation,
      totalBilled,
      totalPaid,
      outstandingBalance,
      pendingMaintenanceCount,
      totalVisitors,
    };
  };

  const getUser = async (userId: number) => {
    const userRecord = await db.query.user.findFirst({
      where: { id: userId },
      ...userWithRelations,
    });
    return userRecord;
  };

  const getStudentWithRelations = async (userId: number) => {
    const studentRecord = await db.query.student.findFirst({
      where: { userId },
      ...studentWithRelations,
    });
    return studentRecord;
  };

  const getStudentGenderByUserId = async (userId: number) => {
    const gender = await db.query.student.findFirst({
      where: { userId },
      columns: { gender: true },
    });
    return gender;
  };

  const getUserProfile = async (userId: number) => {
    const userRecord = await db.query.user.findFirst({
      where: {
        id: userId,
      },
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
        image: true,
      },
      extras: {
        hostel: sql<string>`COALESCE(
          (SELECT h.name FROM admin a JOIN hostel h ON a.hostel_id = h.id WHERE a.user_id = ${userId} AND a.status = 'active' LIMIT 1),
          (SELECT h2.name FROM student s JOIN hostel h2 ON s.hostel_id = h2.id WHERE s.user_id = ${userId} LIMIT 1)
        )`.as("hostel"),

        company:
          sql<string>`(SELECT c.name FROM admin a JOIN company c ON a.company_id = c.id WHERE a.user_id = ${userId} AND a.status = 'active' LIMIT 1)`.as(
            "company",
          ),
        phoneNumber: sql<string>`COALESCE(
          (SELECT a.phone_number FROM admin a WHERE a.user_id = ${userId} AND a.status = 'active' LIMIT 1),
          (SELECT s.phone_number FROM student s WHERE s.user_id = ${userId} LIMIT 1)
        )`.as("phoneNumber"),
      },
    });
    return userRecord;
  };

  const updateUserProfile = async (userId: number, payload: Partial<typeof user.$inferInsert>) => {
    const updateData: Partial<typeof user.$inferInsert> = {};

    if (payload.name !== undefined) updateData.name = payload.name;

    if (payload.email !== undefined) updateData.email = payload.email.toLowerCase().trim();

    if (payload.image !== undefined) updateData.image = payload.image;

    if (payload.password !== undefined) updateData.password = payload.password;

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  };

  const getUserExtended = async (userId: number) => {
    const userRecord = await db.query.user.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
      },
      extras: {
        phoneNumber: sql<string>`COALESCE(
          (SELECT a.phone_number FROM admin a WHERE a.user_id = ${userId} AND a.status = 'active' LIMIT 1),
          (SELECT s.phone_number FROM student s WHERE s.user_id = ${userId} LIMIT 1)
        )`.as("phoneNumber"),
      },
      where: { id: userId },
    });
    return userRecord;
  };

  /**
   * Updates the phone number for a user, either as a student or admin.
   * @param userId The user's ID.
   * @param phoneNumber The new phone number.
   * @param role The user's role: "student" or "admin".
   */
  const updatePhoneNumber = async (
    userId: number,
    phoneNumber: string,
    role: "student" | "admin",
  ) => {
    if (role === "student") {
      const [updatedStudent] = await db
        .update(student)
        .set({ phoneNumber })
        .where(eq(student.userId, userId))
        .returning();
      return updatedStudent;
    }
    else if (role === "admin") {
      const [updatedAdmin] = await db
        .update(admin)
        .set({ phoneNumber })
        .where(eq(admin.userId, userId))
        .returning();
      return updatedAdmin;
    }
    else {
      throw new Error("Invalid role for phone number update");
    }
  };

  const createNewStudent = async (data: StudentInsert) => {
    const [newStudent] = await db
      .insert(student)
      .values({
        userId: data.userId,
        address: data.address,
        dateOfBirth: data.dateOfBirth,
        emergencyContactEmail: data.emergencyContactEmail,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhoneNumber: data.emergencyContactPhoneNumber,
        healthConditions: data.healthConditions,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
        residencyStatus: data.residencyStatus,
      })
      .returning();

    return newStudent;
  };

  const getStudentCompanyId = async (studentId: number) => {
    const result = await db.query.student.findFirst({
      where: { id: studentId },
      columns: {
        companyId: true,
        userId: true,
        residencyStatus: true,
      },
    });
    return result;
  };

  return {
    updateUserLastLogin,
    cleanupExpiredVerificationTokens,
    getUserByEmail,
    getUserById,
    getOnboardedStudent,
    getTotalStudents,
    getTotalAdmins,
    getActiveStudentsCount,
    getAdminByUserId,
    getAdminByUserIdUnscoped,
    checkIfUserExists,
    // getUsersScoped,
    deleteUsersByIds,
    getUserByIds,
    createOrUpdateAdminForUser,
    disableAdminByUserId,
    getFailedAttemptsCount,
    recordLoginAttempt,
    getStudentByUserId,
    getStudentForDashboardByUserId,
    getUsers,
    getUser,
    getStudentWithRelations,
    getStudentGenderByUserId,
    getStudentIdByUserId,
    getUserProfile,
    updateUserProfile,
    updatePhoneNumber,
    getUserExtended,
    createNewStudent,
    getStudentCompanyId,
  };
}

type StudentWithRelations = Awaited<
  ReturnType<Awaited<ReturnType<typeof userQueries>>["getStudentForDashboardByUserId"]>
>;
export type StudentDashboard = NonNullable<StudentWithRelations>;

export type UserStats = Awaited<
  ReturnType<Awaited<ReturnType<typeof userQueries>>["getUsers"]>
>["stats"];

export type UserProfileType = Awaited<
  ReturnType<Awaited<ReturnType<typeof userQueries>>["getUserProfile"]>
>;

// type UserWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof userQueries>>["getUser"]>>;
// export type UserWR = NonNullable<UserWithRelations>;
