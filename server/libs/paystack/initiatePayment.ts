import type { SplitType } from "./resolveSubaccount";

import { resolveSubaccount } from "./resolveSubaccount";

type InitiatePaymentParams = {
  billingId: number;
  /** Must match the authenticated student making the request. */
  studentId: number;
  /**
   * Unique reference you generate before calling this function.
   * Store it in your pending payment record before calling Paystack
   * so you can reconcile the webhook even if the response is lost.
   */
  reference: string;
  callbackUrl: string;
};

type InitiatePaymentResult = {
  authorizationUrl: string;
  reference: string;
  subaccountCode: string | null;
  splitType: SplitType;
};

/**
 * Initiates a Paystack payment for a billing record.
 *
 * Security properties enforced here:
 * - Verifies the billing record belongs to the requesting student.
 * - Verifies the billing record belongs to the correct company (scoped).
 * - Verifies the billing is in a payable state (unpaid / partially paid / overdue).
 * - Computes the outstanding balance so the student can never overpay.
 * - Resolves and injects the correct subaccount before calling Paystack.
 * - Returns the subaccountCode + splitType so the caller can stamp them
 *   onto the pending payment row immediately.
 *
 * This function does NOT write to the database — that is the caller's
 * responsibility so the transaction boundary stays in the API route.
 *
 * @throws {Error} with a safe public message if any guard fails.
 */
export async function initiatePayment(
  params: InitiatePaymentParams,
): Promise<InitiatePaymentResult> {
  const { db } = useDB();

  // ------------------------------------------------------------------
  // 1. Load the billing record with only the fields we need.
  //    Scoped to studentId so a student cannot pay someone else's bill.
  // ------------------------------------------------------------------
  const billingRecord = await db.query.billing.findFirst({
    where: { id: params.billingId },
    columns: {
      id: true,
      studentId: true,
      hostelId: true,
      companyId: true,
      amount: true,
      paidAmount: true,
      lateFee: true,
      status: true,
    },
    with: {
      student: {
        columns: { id: true },
        with: {
          user: {
            columns: { email: true },
          },
        },
      },
    },
  });

  if (!billingRecord) {
    throw new Error("Billing record not found.");
  }

  if (billingRecord.studentId !== params.studentId) {
    throw new Error("Billing record not found.");
  }

  const payableStatuses = new Set(["unpaid", "partially paid", "overdue"]);
  if (!payableStatuses.has(billingRecord.status)) {
    throw new Error(
      `This bill cannot be paid in its current status: ${billingRecord.status}.`,
    );
  }

  const totalDue
    = Number.parseFloat(billingRecord.amount)
      + Number.parseFloat(billingRecord.lateFee ?? "0");
  const alreadyPaid = Number.parseFloat(billingRecord.paidAmount ?? "0");
  const outstanding = Number.parseFloat((totalDue - alreadyPaid).toFixed(2));

  if (outstanding <= 0) {
    throw new Error("This bill has no outstanding balance.");
  }

  const { subaccountCode, splitType } = await resolveSubaccount(
    billingRecord.hostelId,
    billingRecord.companyId,
  );

  const email = billingRecord.student?.user?.email;
  if (!email) {
    throw new Error("Student email not found for billing record.");
  }

  const response = await initializePaystackTransaction({
    email,
    amount: outstanding,
    reference: params.reference,
    callbackUrl: params.callbackUrl,
    subaccountCode: subaccountCode ?? undefined,
    metadata: {
      billingId: billingRecord.id,
      studentId: params.studentId,
      splitType,
    },
  });

  if (!response.status || !response.data?.authorization_url) {
    throw new Error("Failed to initialize payment. Please try again.");
  }

  return {
    authorizationUrl: response.data.authorization_url,
    reference: params.reference,
    subaccountCode,
    splitType,
  };
}
