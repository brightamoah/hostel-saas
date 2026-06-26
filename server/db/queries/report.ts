import type { H3Event } from "h3";
import type { ReportConfigSchema } from "~~/shared/utils/schema";
import { and, eq, sql } from "drizzle-orm";
import { pickFields, sortReportData } from "~~/shared/utils/reportutils";
import { reportTemplate } from "../schema";

export async function reportQueries(event?: H3Event) {
  const { db } = useDB(event);

  const applyScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return {};
    if (mode === "company" && scope.companyId) return { companyId: scope.companyId };
    if (mode === "hostel" && scope.hostelId) return { hostelId: scope.hostelId };
    return { RAW: () => sql`FALSE` };
  };

  function applyScopeSql(scope: AdminScope) {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(reportTemplate.companyId, scope.companyId)];
    if (mode === "hostel" && scope.hostelId) return [eq(reportTemplate.hostelId, scope.hostelId)];
    return [sql`FALSE`];
  }

  const getTemplatesForComapany = async (scope: AdminScope) => {
    return db.query.reportTemplate.findMany({
      where: { ...applyScope(scope) },
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  };

  const getTemplateById = async (templateId: number, scope: AdminScope) => {
    return db.query.reportTemplate.findFirst({
      where: { id: templateId, ...applyScope(scope) },
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  };

  const getBillingReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.billing.findMany({
      where: {
        status: config.statusFilter?.length ? { in: config.statusFilter as unknown as Billing["status"][] } : undefined,
        type: config.filters?.type as Billing["type"],
        academicPeriod: config.filters?.academicPeriod as Billing["academicPeriod"],
        dateIssued: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start) : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end) : undefined,
        },
        ...applyScope(scope),
      },
      with: {
        student: {
          with: {
            user: {
              columns: {
                password: false,
                resetToken: false,
                resetTokenExpiresAt: false,
                verificationToken: false,
                verificationTokenExpiresAt: false,
              },
            },
          },
        },
      },
      extras: {
        invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      email: item?.student?.user?.email ?? null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getRoomReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.room.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as Room["status"][] } : undefined,
        roomType: config.filters?.roomType as Room["roomType"],
        floor: config.filters?.floor ? Number(config.filters.floor) : undefined,
        allowedGender: config.filters?.allowedGender as Room["allowedGender"],
      },
    });

    const picked = query.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getStudentReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.student.findMany({
      where: {
        ...applyScope(scope),
        gender: config.filters?.gender ? config.filters.gender as Student["gender"] : undefined,
        createdAt: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start) : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end) : undefined,
        },
      },
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
        allocations: {
          columns: {
            academicPeriod: true,
            academicYear: true,
            allocationDate: true,
            endDate: true,
            status: true,
          },
          with: {
            room: {
              columns: {
                roomNumber: true,
                floor: true,
                roomType: true,
              },
            },
          },
        },
      },
    });

    const flattened = query.map((item) => {
      const activeAllocation = item.allocations.find(a => a.status === "active") ?? item.allocations[0];

      return {
        ...item,
        name: item?.user?.name ?? null,
        email: item?.user?.email ?? null,
        roomNumber: activeAllocation?.room?.roomNumber ?? null,
        academicPeriod: activeAllocation?.academicPeriod ?? null,
        studentId: item.id,
      };
    });

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getVisitorReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.visitor.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as VisitorStatus[] } : undefined,
        visitDate: {
          gte: config.dateRange?.start ? config.dateRange.start : undefined,
          lte: config.dateRange?.end ? config.dateRange.end : undefined,
        },
      },
      with: {
        student: {
          with: {
            user: {
              columns: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      email: item?.student?.user?.email ?? null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getMaintenanceReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.maintenanceRequest.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as MaintenanceType["status"][] } : undefined,
        priority: config.filters?.priority ? config.filters.priority as MaintenanceType["priority"] : undefined,
        issueType: config.filters?.issueType ? config.filters.issueType as MaintenanceType["issueType"] : undefined,
        createdAt: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start) : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end) : undefined,
        },
      },
      columns: {
        id: true,
        description: true,
        issueType: true,
        priority: true,
        status: true,
        createdAt: true,
      },
      with: {
        student: {
          columns: {
            enrollmentDate: true,
            gender: true,
            address: true,
            phoneNumber: true,
            residencyStatus: true,
          },
          with: {
            user: {
              columns: {
                name: true,
                email: true,
              },
            },
            allocations: {
              limit: 1,
              where: {
                status: "active",
              },
              with: {
                room: {
                  columns: {
                    roomNumber: true,
                    floor: true,
                    roomType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      email: item?.student?.user?.email ?? null,
      roomNumber: item?.student?.allocations?.[0]?.room?.roomNumber ?? null,
      academicPeriod: item?.student?.allocations?.[0]?.academicPeriod ?? null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getComplaintReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.complaint.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as Complaint["status"][] } : undefined,
        priority: config.filters?.priority ? config.filters.priority as Complaint["priority"] : undefined,
        type: config.filters?.type ? config.filters.type as Complaint["type"] : undefined,
        createdAt: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start) : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end) : undefined,
        },
      },
      columns: {
        id: true,
        description: true,
        type: true,
        priority: true,
        status: true,
        createdAt: true,
      },
      with: {
        student: {
          columns: {
            enrollmentDate: true,
            gender: true,
            address: true,
            phoneNumber: true,
            residencyStatus: true,
          },
          with: {
            user: {
              columns: {
                name: true,
                email: true,
              },
            },
            allocations: {
              limit: 1,
              where: {
                status: "active",
              },
              with: {
                room: {
                  columns: {
                    roomNumber: true,
                    floor: true,
                    roomType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      email: item?.student?.user?.email ?? null,
      roomNumber: item?.student?.allocations?.[0]?.room?.roomNumber ?? null,
      academicPeriod: item?.student?.allocations?.[0]?.academicPeriod ?? null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getUserReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const students = await db.query.student.findMany({
      where: {
        ...applyScope(scope),
      },
      with: {
        user: true,
      },
    });

    const admins = await db.query.admin.findMany({
      where: {
        ...applyScope(scope),
      },
      with: {
        user: true,
      },
    });

    const usersMap = new Map();

    for (const s of students) {
      if (s.user) {
        usersMap.set(s.user.id, {
          ...s.user,
          phoneNumber: s.phoneNumber,
        });
      }
    }

    for (const a of admins) {
      if (a.user) {
        usersMap.set(a.user.id, {
          ...a.user,
          phoneNumber: a.phoneNumber,
        });
      }
    }

    const uniqueUsers = Array.from(usersMap.values());

    const filtered = uniqueUsers.filter((u) => {
      let pass = true;
      if (config.dateRange?.start) pass = pass && new Date(u.createdAt) >= new Date(config.dateRange.start);
      if (config.dateRange?.end) pass = pass && new Date(u.createdAt) <= new Date(config.dateRange.end);
      return pass;
    });
    const picked = filtered.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getPaymentReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.payment.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as Payment["status"][] } : undefined,
        paymentMethod: config.filters?.paymentMethod as Payment["paymentMethod"],
        paymentDate: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start) : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end) : undefined,
        },
      },
      with: {
        student: {
          columns: {
            enrollmentDate: true,
            gender: true,
            address: true,
            phoneNumber: true,
            residencyStatus: true,
          },
          with: {
            user: {
              columns: { name: true, email: true },
            },
          },
        },
        billing: {
          columns: {
            id: true,
            dueDate: true,
            dateIssued: true,
            amount: true,
            status: true,
            description: true,
            updatedAt: true,
          },
        },
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      invoiceNumber: item?.billing ? `INV-${String(item.billing.id).padStart(6, "0")}` : null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const getAllocationReportData = async (config: ReportConfigSchema, scope: AdminScope) => {
    const query = await db.query.allocation.findMany({
      where: {
        ...applyScope(scope),
        status: config.statusFilter?.length ? { in: config.statusFilter as Allocation["status"][] } : undefined,
        academicYear: config.filters?.academicYear as string,
        academicPeriod: config.filters?.academicPeriod as Allocation["academicPeriod"],
        allocationDate: {
          gte: config.dateRange?.start ? new Date(config.dateRange.start).toISOString() : undefined,
          lte: config.dateRange?.end ? new Date(config.dateRange.end).toISOString() : undefined,
        },
      },
      with: {
        student: {
          with: {
            user: { columns: { name: true } },
          },
        },
        room: {
          columns: { roomNumber: true },
        },
      },
    });

    const flattened = query.map(item => ({
      ...item,
      studentName: item?.student?.user?.name ?? null,
      roomNumber: item?.room?.roomNumber ?? null,
    }));

    const picked = flattened.map(r => pickFields(r, config.fields));
    return sortReportData(picked, config.sortBy, config.sortDir);
  };

  const upsertTemplate = async (data: ReportTemplate, scope: AdminScope) => {
    if (data.id) {
      const [updated] = await db
        .update(reportTemplate)
        .set({
          title: data.title,
          description: data.description,
          config: data.config,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              reportTemplate.id,
              data.id,
            ),
            ...applyScopeSql(scope),
          ),
        )
        .returning();

      return updated;
    }

    const [inserted] = await db
      .insert(reportTemplate)
      .values({
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        module: data.module,
        config: data.config,
        userId: data.userId,
        isPrebuilt: data.isPrebuilt ?? false,
      })
      .returning();

    return inserted;
  };

  const deleteTemplate = async (templateId: number, scope: AdminScope) => {
    const [deleted] = await db
      .delete(reportTemplate)
      .where(
        and(
          eq(reportTemplate.id, templateId),
          ...applyScopeSql(scope),
        ),
      )
      .returning();
    return deleted;
  };

  return {
    getBillingReportData,
    getPaymentReportData,
    getAllocationReportData,
    getRoomReportData,
    getStudentReportData,
    getVisitorReportData,
    getMaintenanceReportData,
    getComplaintReportData,
    getTemplatesForComapany,
    getTemplateById,
    upsertTemplate,
    deleteTemplate,
    getUserReportData,
  };
}

export type SavedTemplate = Awaited<ReturnType<Awaited<ReturnType<typeof reportQueries>>["getTemplatesForComapany"]>>[number];
