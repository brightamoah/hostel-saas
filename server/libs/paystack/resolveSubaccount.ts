import type { H3Event } from "h3";

export type SplitType = "company" | "hostel" | "platform";

export type ResolvedSubaccount = {
  subaccountCode: string | null;
  splitType: SplitType;
};

/**
 * Resolves which Paystack subaccount should receive a payment for a given
 * hostel, following this priority chain:
 *
 *   1. Hostel-level subaccount  (useHostelSubaccount = true AND verified AND code present)
 *   2. Company-level subaccount (verified AND code present)
 *   3. Platform fallback        (no subaccount — funds go to master account)
 *
 * This function is the single source of truth for routing decisions.
 * It is called once per payment initiation and the result is written onto
 * the payment record immediately so there is always an audit trail of
 * exactly where each payment was routed, even if settings change later.
 *
 * @param hostelId  - The hostel the billing record belongs to.
 * @param companyId - The company that owns the hostel.
 */
export async function resolveSubaccount(
  hostelId: number,
  companyId: number,
  event?: H3Event,
): Promise<ResolvedSubaccount> {
  const { db } = useDB(event);

  const [hostelSetting, companySetting] = await Promise.all([
    db.query.hostelSettings.findFirst({
      where: { hostelId },
      columns: {
        useHostelSubaccount: true,
        paystackSubaccountCode: true,
        paystackIsVerified: true,
      },
    }),
    db.query.companySettings.findFirst({
      where: { companyId },
      columns: {
        paystackSubaccountCode: true,
        paystackIsVerified: true,
      },
    }),
  ]);

  if (
    hostelSetting?.useHostelSubaccount === true
    && hostelSetting.paystackSubaccountCode
  ) {
    return {
      subaccountCode: hostelSetting.paystackSubaccountCode,
      splitType: "hostel",
    };
  }

  if (companySetting?.paystackSubaccountCode) {
    return {
      subaccountCode: companySetting.paystackSubaccountCode,
      splitType: "company",
    };
  }

  return {
    subaccountCode: null,
    splitType: "platform",
  };
}
