import type { AdminScope, BillingInsert } from "~~/shared/types";

import { and, desc, eq, ne, sql } from "drizzle-orm";

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
    const filters = applyBillingScope(scope);

    filters.push(ne(billing.status, "cancelled"));

    const [result] = await db
      .select({
        totalBillings: sql<number>`coalesce(sum(${billing.amount}), 0)`,
        totalPaid: sql<number>`coalesce(sum(${billing.paidAmount}), 0)`,
        totalUnpaid: sql<number>`coalesce(sum(${billing.amount} - ${billing.paidAmount}), 0)`,
        totalOverdue: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} < NOW() AND ${billing.status} NOT IN ('fully paid', "cancelled")
        THEN ${billing.amount} - ${billing.paidAmount} 
        ELSE 0 END
      ), 0)`,
        totalPending: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} >= NOW() AND ${billing.status} NOT IN ('fully paid', 'cancelled')
        THEN ${billing.amount} - ${billing.paidAmount} 
        ELSE 0 END
      ), 0)`,
      })
      .from(billing)
      .where(and(...filters));

    return {
      totalBillings: Number(result?.totalBillings),
      totalPaid: Number(result?.totalPaid || 0),
      totalUnpaid: Number(result?.totalUnpaid || 0),
      totalPending: Number(result?.totalPending || 0),
      totalOverdue: Number(result?.totalOverdue || 0),
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
    const [result] = await db
      .select({
        totalBillings: sql<number>`coalesce(sum(${billing.amount}), 0)`,
        totalPaid: sql<number>`coalesce(sum(${billing.paidAmount}), 0)`,
        totalUnpaid: sql<number>`coalesce(sum(${billing.amount} - ${billing.paidAmount}), 0)`,
        totalOverdue: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} < NOW() AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} 
        ELSE 0 END
      ), 0)`,
        totalPending: sql<number>`coalesce(sum(
        CASE WHEN ${billing.dueDate} >= NOW() AND ${billing.status} != 'fully paid' 
        THEN ${billing.amount} - ${billing.paidAmount} 
        ELSE 0 END
      ), 0)`,

      })
      .from(billing)
      .where(
        and(
          eq(billing.studentId, studentId),
          ne(billing.status, "cancelled"),
        ),
      );

    return {
      totalBillings: Number(result?.totalBillings),
      totalPaid: Number(result?.totalPaid || 0),
      totalUnpaid: Number(result?.totalUnpaid || 0),
      totalPending: Number(result?.totalPending || 0),
      totalOverdue: Number(result?.totalOverdue || 0),
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
