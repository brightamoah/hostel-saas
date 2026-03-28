import type { AdminScope, BillingInsert } from "~~/shared/types";

import { and, desc, eq, exists, gt, ne, sql } from "drizzle-orm";

import type { paymentMethod } from "../schema";

import { billing, payment } from "../schema";

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
    hostel: true,
    payments: true,
  },

} as const;

type PaymentMethodType = typeof paymentMethod.enumValues[number];

export async function billingQueries() {
  const { db } = useDB();

  const applyBillingScope = (scope: AdminScope) => {
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
        where: and(
          eq(billing.id, billingId),
          ...applyBillingScope(scope),
        ),
        extras: {
          invoiceNumber: sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`.as("invoice_number"),
        },
        ...billingWithRelations,
      });
  };

  const getBillingByIdStudent = async (billingId: number) => {
    return await db
      .query
      .billing
      .findFirst({
        where: eq(billing.id, billingId),
        extras: {
          invoiceNumber: sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`.as("invoice_number"),
        },
        ...billingWithRelations,
      });
  };

  const getScopedBillingsAdmin = async (scope: AdminScope) => {
    return await db
      .query
      .billing
      .findMany({
        where: and(...applyBillingScope(scope)),
        extras: {
          invoiceNumber: sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`.as("invoice_number"),
        },
        ...billingWithRelations,
        orderBy: desc(billing.createdAt),
      });
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

    const billingFilters = applyBillingScope(scope);
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
      .where(and(...paymentConditions, gt(payment.paymentDate, startOfLastMonth)));

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
        where: eq(billing.studentId, studentId),
        extras: {
          invoiceNumber: sql<string>`'INV-' || lpad(${billing.id}::text, 6, '0')`.as("invoice_number"),
        },
        ...billingWithRelations,
        orderBy: desc(billing.createdAt),
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
        gt(payment.paymentDate, startOfLastWeek),
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

  const createBilling = async (data: BillingInsert) => {
    const [result] = await db
      .insert(billing)
      .values(data)
      .returning();
    return result;
  };

  const checkExistingPayment = async (reference: string) => {
    const result = await db
      .query
      .payment
      .findFirst({
        where: eq(payment.transactionReference, reference),
      });
    return result;
  };

  const createPaymentIntent = async (
    billingId: number,
    studentId: number,
    companyId: number,
    amount: number,
    reference: string,
  ) => {
    await db.insert(payment).values({
      billingId,
      studentId,
      companyId,
      amount: amount.toString(),
      transactionReference: reference,
      paymentMethod: "card",
      status: "pending",
      paymentDate: new Date(),
    });
  };

  const markPaymentAsFailed = async (reference: string) => {
    await db
      .update(payment)
      .set({ status: "failed" })
      .where(eq(payment.transactionReference, reference));
  };

  const processSuccessfulPayment = async (
    billingId: number,
    reference: string,
    paymentMethod: PaymentMethodType,
    verifiedAmount: number,
  ) => {
    await db.update(payment)
      .set({
        amount: sql`${verifiedAmount}::numeric`,
        status: "completed",
        paymentDate: new Date(),
        paymentMethod,
      })
      .where(eq(payment.transactionReference, reference));
  };

  return {
    getBillingById,
    getScopedBillingsAdmin,
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
