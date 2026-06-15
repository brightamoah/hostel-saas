import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event);
  const secretKey = runtimeConfig.paystackSecretKey;

  if (!secretKey) {
    throw createError({ statusCode: 500, message: "Paystack secret key is missing" });
  }

  const signature = getHeader(event, "x-paystack-signature");
  if (!signature) {
    throw createError({ statusCode: 400, message: "Missing Paystack signature" });
  }

  const rawBody = await readRawBody(event);
  if (!rawBody) {
    throw createError({ statusCode: 400, message: "Missing request body" });
  }

  // HMAC SHA-512 verification
  const hash = bytesToHex(hmac(sha512, utf8ToBytes(secretKey), utf8ToBytes(rawBody)));

  if (hash !== signature) {
    throw createError({
      statusCode: 400,
      message: "Invalid signature",
    });
  }

  const payload = JSON.parse(rawBody);

  // We only care about charge.success
  if (payload.event === "charge.success") {
    const transaction = payload.data;
    const reference = transaction.reference;

    const {
      checkExistingPayment,
      processSuccessfulPayment,
      getBillingByIdStudent,
    } = await billingQueries(event);

    const existingPayment = await checkExistingPayment(reference);

    // If not found or already processed, acknowledge and stop
    if (!existingPayment || existingPayment.status === "completed") {
      return { received: true };
    }

    const billingId = existingPayment.billingId;

    if (!billingId) {
      return { received: true };
    }

    const currentBilling = await getBillingByIdStudent(billingId);

    if (!currentBilling) {
      return { received: true };
    }

    const verifiedAmount = Number(transaction.amount) / 100;
    const paymentMethod = mapPaystackChannel(transaction.channel);

    const billingHostelId = "hostelId" in currentBilling && typeof currentBilling.hostelId === "number"
      ? currentBilling.hostelId
      : null;

    const auditContext = getAuditContext({
      kind: "system",
      companyId: existingPayment.companyId ?? null,
      hostelId: billingHostelId,
    });

    await processSuccessfulPayment(
      billingId,
      reference,
      paymentMethod,
      verifiedAmount,
      auditContext,
    );
  }

  return { received: true };
});
