import type { H3Event } from "h3";
import type { AdminScope, AuditContext, BillingInsert, Period } from "~~/shared/types";

import type { paymentMethod } from "../schema";
import { and, eq, exists, gt, ne, sql } from "drizzle-orm";
import { computeAuditDiff } from "~~/server/utils/auditLogUtils";
import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";

import { getScopeMode } from "~~/server/utils/permissionScope";

import { billing, payment } from "../schema";
import { auditLogQueries } from "./auditLog";

const billingWithRelations = {
  with: {
    student: {
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
    allocation: true,
    hostel: {
      with: {
        settings: true,
      },
    },
    company: {
      with: {
        settings: true,
      },
    },
    payments: true,
  },
} as const;

type PaymentMethodType = typeof paymentMethod.enumValues[number];

export async function billingQueries(event?: H3Event) {
  const { db } = useDB(event);

  const { logAudit } = await auditLogQueries(event);

  const applyBillingScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return {};
    if (mode === "company" && scope.companyId) return { companyId: scope.companyId };
    if (mode === "hostel" && scope.hostelId) return { hostelId: scope.hostelId };
    return { RAW: () => sql`FALSE` };
  };

  const applyBillingScopeSql = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(billing.companyId, scope.companyId)];
    if (mode === "hostel" && scope.hostelId) return [eq(billing.hostelId, scope.hostelId)];
    return [sql`FALSE`];
  };

  const getBillingById = async (billingId: number, scope: AdminScope) => {
    return await db
      .query
      .billing
      .findFirst({
        where: {
          id: billingId,
          ...applyBillingScope(scope),
        },
        extras: {
          invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
        },
        ...billingWithRelations,
      });
  };

  const getBillingByIdStudent = async (billingId: number) => {
    return await db
      .query
      .billing
      .findFirst({
        where: {
          id: billingId,
        },
        extras: {
          invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
        },
        ...billingWithRelations,
      });
  };

  const getScopedBillingsAdmin = async (scope: AdminScope) => {
    return await db
      .query
      .billing
      .findMany({
        where: {
          ...applyBillingScope(scope),
        },
        extras: {
          invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
        },
        ...billingWithRelations,
        orderBy: {
          createdAt: "desc",
        },
      });
  };

  //  const conditions = [];
  //   const mode = getScopeMode(scope);
  //   if (mode === "company" && scope.companyId) {
  //     conditions.push(eq(payment.companyId, scope.companyId));
  //   } else if (mode === "hostel" && scope.hostelId) {
  //     conditions.push(
  //       exists(
  //         db.select()
  //           .from(billing)
  //           .where(and(
  //             eq(billing.id, payment.billingId),
  //             eq(billing.hostelId, scope.hostelId),
  //           )),
  //       ),
  //     );
  //   } else if (mode !== "platform") {
  //     conditions.push(sql`FALSE`);
  //   }

  //   return await db
  //     .select({
  //       id: payment.id,
  //       amount: payment.amount,
  //       paymentDate: payment.paymentDate,
  //       transactionReference: payment.transactionReference,
  //       paymentMethod: payment.paymentMethod,
  //       status: payment.status,
  //       companyId: payment.companyId,
  //       student: {
  //         firstName: student.firstName,
  //         lastName: student.lastName,
  //         email: student.email,
  //       },
  //       billing: {
  //         id: billing.id,
  //         type: billing.type,
  //         description: billing.description,
  //         invoiceNumber: sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
  //       },
  //     })
  //     .from(payment)
  //     .leftJoin(student, eq(payment.studentId, student.id))
  //     .leftJoin(billing, eq(payment.billingId, billing.id))
  //     .where(and(...conditions))
  //     .orderBy(desc(payment.paymentDate));

  const getScopedPaymentsAdmin = async (scope: AdminScope) => {
    const paymentWithData = await db.query.payment.findMany({
      where: {
        ...applyBillingScope(scope),
      },
      columns: {
        id: true,
        amount: true,
        paymentDate: true,
        transactionReference: true,
        paymentMethod: true,
        status: true,
        companyId: true,
      },
      with: {
        student: {
          columns: {
            id: true,
            phoneNumber: true,
            address: true,
            gender: true,
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
        billing: {
          columns: {
            id: true,
            type: true,
            description: true,
          },
          with: {
            hostel: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          extras: {
            invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return paymentWithData;
  };

  const getBillingStatusCount = async (scope: AdminScope) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const mode = getScopeMode(scope);

    const billingFilters = applyBillingScopeSql(scope);
    const activeBillingFilters = [...billingFilters, ne(billing.status, "cancelled")];

    const [billingResult] = await db
      .select({
        totalBilledAbs: sql<number>`coalesce(sum(${billing.amount}), 0)`,
        totalPaidAbs: sql<number>`coalesce(sum(${billing.paidAmount}), 0)`,

        pendingAbs: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} >= CURRENT_DATE AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END
      ), 0)`,

        overdueAbs: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} < CURRENT_DATE AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END
      ), 0)`,

        billedThisMonth: sql<number>`coalesce(sum(CASE WHEN ${billing.createdAt} >= ${startOfThisMonth} THEN ${billing.amount} ELSE 0 END), 0)`,
        billedLastMonth: sql<number>`coalesce(sum(CASE WHEN ${billing.createdAt} >= ${startOfLastMonth} AND ${billing.createdAt} < ${startOfThisMonth} THEN ${billing.amount} ELSE 0 END), 0)`,

        pendingThisWeek: sql<number>`coalesce(sum(CASE WHEN ${billing.dueDate} >= ${startOfThisWeek} AND ${billing.status} != 'fully paid' THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END), 0)`,
        pendingLastWeek: sql<number>`coalesce(sum(CASE WHEN ${billing.dueDate} >= ${startOfLastWeek} AND ${billing.dueDate} < ${startOfThisWeek} AND ${billing.status} != 'fully paid' THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END), 0)`,

        overdueToday: sql<number>`coalesce(sum(CASE WHEN ${billing.dueDate} < CURRENT_DATE AND ${billing.status} != 'fully paid' AND ${billing.updatedAt} >= ${startOfToday} THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END), 0)`,
        overdueYesterday: sql<number>`coalesce(sum(CASE WHEN ${billing.dueDate} < CURRENT_DATE AND ${billing.status} != 'fully paid' AND ${billing.updatedAt} >= ${startOfYesterday} AND ${billing.updatedAt} < ${startOfToday} THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END), 0)`,
      })
      .from(billing)
      .where(and(...activeBillingFilters));

    const paymentConditions = [eq(payment.status, "completed")];

    if (mode === "company") {
      paymentConditions.push(eq(payment.companyId, scope.companyId!));
    }
    else if (mode === "hostel") {
      paymentConditions.push(
        exists(
          db.select()
            .from(billing)
            .where(and(
              eq(billing.id, payment.billingId),
              eq(billing.hostelId, scope.hostelId!),
            )),
        ),
      );
    }

    const [paymentResult] = await db
      .select({
        paidThisMonth: sql<number>`coalesce(sum(${payment.amount}), 0)`,
        paidLastMonth: sql<number>`coalesce(sum(CASE WHEN ${payment.paymentDate} < ${startOfThisMonth} THEN ${payment.amount} ELSE 0 END), 0)`,
      })
      .from(payment)
      .where(and(...paymentConditions, gt(payment.paymentDate, new Date(startOfLastMonth))));

    return {
      totalBillings: {
        value: Number(billingResult?.totalBilledAbs || 0),
        percentage: calcChange(Number(billingResult?.billedThisMonth || 0), Number(billingResult?.billedLastMonth || 0)),
        period: "monthly" as Period,
      },
      totalPaid: {
        value: Number(billingResult?.totalPaidAbs || 0), // Current total from Ledger
        percentage: calcChange(Number(paymentResult?.paidThisMonth || 0), Number(paymentResult?.paidLastMonth || 0)), // Cash velocity trend
        period: "monthly" as Period,
      },
      totalPending: {
        value: Number(billingResult?.pendingAbs || 0),
        percentage: calcChange(Number(billingResult?.pendingThisWeek || 0), Number(billingResult?.pendingLastWeek || 0)),
        period: "weekly" as Period,
      },
      totalOverdue: {
        value: Number(billingResult?.overdueAbs || 0),
        percentage: calcChange(Number(billingResult?.overdueToday || 0), Number(billingResult?.overdueYesterday || 0)),
        period: "daily" as Period,
      },
    };
  };

  const getStudentScopedBillings = async (studentId: number) => {
    return await db
      .query
      .billing
      .findMany({
        where: {
          studentId,
        },
        extras: {
          invoiceNumber: (billing, { sql }) => sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`,
        },
        ...billingWithRelations,
        orderBy: {
          createdAt: "desc",
        },
      });
  };

  const getStudentBillingStatusCount = async (studentId: number) => {
    const {
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const [billingResult] = await db
      .select({
        totalBilledAbs: sql<number>`coalesce(sum(${billing.amount}), 0)`,
        totalPaidAbs: sql<number>`coalesce(sum(${billing.paidAmount}), 0)`,
        balanceAbs: sql<number>`coalesce(sum(${billing.amount} - ${billing.paidAmount}), 0)`,

        overdueAbs: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} < CURRENT_DATE AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END
      ), 0)`,

        billedThisMonth: sql<number>`coalesce(sum(CASE WHEN ${billing.createdAt} >= ${startOfThisMonth} THEN ${billing.amount} ELSE 0 END), 0)`,
        billedLastMonth: sql<number>`coalesce(sum(CASE WHEN ${billing.createdAt} >= ${startOfLastMonth} AND ${billing.createdAt} < ${startOfThisMonth} THEN ${billing.amount} ELSE 0 END), 0)`,

        overdueYesterday: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} < ${startOfYesterday} AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} ELSE 0 END
      ), 0)`,
      })
      .from(billing)
      .where(and(eq(billing.studentId, studentId), ne(billing.status, "cancelled")));

    const [paymentResult] = await db
      .select({
        paidThisWeek: sql<number>`coalesce(sum(${payment.amount}), 0)`,
        paidLastWeek: sql<number>`coalesce(sum(CASE WHEN ${payment.paymentDate} < ${startOfThisWeek} THEN ${payment.amount} ELSE 0 END), 0)`,
      })
      .from(payment)
      .where(and(
        eq(payment.studentId, studentId),
        eq(payment.status, "completed"),
        gt(payment.paymentDate, new Date(startOfLastWeek)),
      ));

    return {
      totalBilled: {
        value: Number(billingResult?.totalBilledAbs || 0),
        percentage: calcChange(Number(billingResult?.billedThisMonth || 0), Number(billingResult?.billedLastMonth || 0)),
        period: "monthly" as Period,
      },
      totalPaid: {
        value: Number(billingResult?.totalPaidAbs || 0),
        percentage: calcChange(Number(paymentResult?.paidThisWeek || 0), Number(paymentResult?.paidLastWeek || 0)),
        period: "weekly" as Period,
      },
      balance: {
        value: Number(billingResult?.balanceAbs || 0),
        percentage: calcChange(Number(billingResult?.balanceAbs || 0), Number(billingResult?.totalBilledAbs || 0)),
        period: "monthly" as Period,
      },
      overdue: {
        value: Number(billingResult?.overdueAbs || 0),
        percentage: calcChange(Number(billingResult?.overdueAbs || 0), Number(billingResult?.overdueYesterday || 0)),
        period: "daily" as Period,
      },
    };
  };

  const createBilling = async (data: BillingInsert, ctx: AuditContext) => {
    const [result] = await db
      .insert(billing)
      .values(data)
      .returning();

    if (!result) {
      throw new Error("Failed to create billing record");
    }

    await logAudit(db, ctx, {
      entityId: result.id,
      entityType: "billing",
      actionType: "CREATE",
      action: "billing.create",
      description: `Created billing record for studentId ${result.studentId} with amount ${result.amount} and status ${result.status} and due date ${result.dueDate}`,
      before: null,
      after: result,
    });

    return result;
  };
  const checkExistingPayment = async (reference: string) => {
    const result = await db
      .query
      .payment
      .findFirst({
        where: {
          transactionReference: reference,
        },
      });
    return result;
  };

  const createPaymentIntent = async (
    billingId: number,
    studentId: number,
    companyId: number,
    amount: number,
    reference: string,
    subaccountCode: string | null,
    splitType: "company" | "hostel" | "platform",
    ctx: AuditContext,
  ) => {
    const [intent] = await db.insert(payment).values({
      billingId,
      studentId,
      companyId,
      amount: amount.toString(),
      transactionReference: reference,
      paystackSubaccountCode: subaccountCode,
      splitType,
      paymentMethod: "card",
      status: "pending",
      paymentDate: new Date(),
    }).returning();

    if (!intent) {
      throw new Error("Failed to create payment intent");
    }

    await logAudit(db, ctx, {
      entityId: intent.billingId,
      entityType: "billing",
      actionType: "CREATE",
      action: "billing.payment_intent_created",
      description: `Created payment intent for billingId ${intent.billingId} with amount ${intent.amount} and reference ${intent.transactionReference}`,
      before: null,
      after: intent,
    });

    return intent;
  };

  const markPaymentAsFailed = async (reference: string, ctx: AuditContext) => {
    const existingPayment = await db
      .query
      .payment
      .findFirst({
        where: {
          transactionReference: reference,
        },
      });

    if (!existingPayment) {
      throw new Error("Payment not found");
    }

    const [updatedPayment] = await db
      .update(payment)
      .set({ status: "failed" })
      .where(eq(payment.transactionReference, reference))
      .returning();

    if (!updatedPayment) {
      throw new Error("Failed to update payment status");
    }

    await logAudit(db, ctx, {
      entityId: updatedPayment.billingId,
      entityType: "billing",
      actionType: "UPDATE",
      action: "billing.payment_failed",
      description: `Marked payment as failed for reference ${reference}`,
      before: existingPayment,
      after: updatedPayment,
      diff: computeAuditDiff(existingPayment, updatedPayment),
    });
  };

  const processSuccessfulPayment = async (
    billingId: number,
    reference: string,
    paymentMethod: PaymentMethodType,
    verifiedAmount: number,
    ctx: AuditContext,
  ) => {
    const beforePayment = await db
      .query
      .payment
      .findFirst({
        where: {
          transactionReference: reference,
          billingId,
        },
      });

    const [updatedPayment] = await db.update(payment)
      .set({
        amount: sql`${verifiedAmount}::numeric`,
        status: "completed",
        paymentDate: new Date(),
        paymentMethod,
      })
      .where(eq(payment.transactionReference, reference))
      .returning();

    if (updatedPayment) {
      await logAudit(db, ctx, {
        entityId: updatedPayment.billingId,
        entityType: "payment",
        actionType: "UPDATE",
        action: "billing.payment_completed",
        description: `Marked payment with reference ${reference} as completed with amount ${verifiedAmount} and payment method ${paymentMethod}`,
        before: beforePayment,
        after: updatedPayment,
        diff: computeAuditDiff(beforePayment, updatedPayment),
      });
    }
  };

  return {
    getBillingById,
    getScopedBillingsAdmin,
    getScopedPaymentsAdmin,
    getBillingStatusCount,
    createBilling,
    getStudentScopedBillings,
    getStudentBillingStatusCount,
    checkExistingPayment,
    createPaymentIntent,
    markPaymentAsFailed,
    processSuccessfulPayment,
    getBillingByIdStudent,
  };
}

type BillingWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof billingQueries>>["getBillingById"]>>;
export type BillingType = NonNullable<BillingWithRelations>;

export type AdminBillingStats = Awaited<ReturnType<Awaited<ReturnType<typeof billingQueries>>["getBillingStatusCount"]>>;

export type StudentBillingStats = Awaited<ReturnType<Awaited<ReturnType<typeof billingQueries>>["getStudentBillingStatusCount"]>>;

export type PaymentType = Awaited<ReturnType<Awaited<ReturnType<typeof billingQueries>>["getScopedPaymentsAdmin"]>>[number];
export type PaymentsWithData = Awaited<ReturnType<Awaited<ReturnType<typeof billingQueries>>["getScopedPaymentsAdmin"]>>;
