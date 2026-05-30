import type { Bank } from "paystack-sdk/dist/misc/interface";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const banksCache: Map<string, { data: Bank[] | null; fetchedAt: number }> = new Map();

export default defineEventHandler(async (event): Promise<PaystackBanksResponseData> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner", "admin"]);

    const currency = (getQuery(event).currency as string | undefined) ?? "GHS";

    const allowedCurrencies = ["GHS", "NGN", "ZAR", "KES", "USD"];

    if (!allowedCurrencies.includes(currency)) {
      throw createError({
        statusCode: 400,
        message: `Unsupported currency. Allowed: ${allowedCurrencies.join(", ")}`,
      });
    }

    const now = Date.now();
    const cachedForCurrency = banksCache.get(currency);

    if (cachedForCurrency && now - cachedForCurrency.fetchedAt < CACHE_TTL_MS) {
      return {
        success: true,
        data: cachedForCurrency.data,
        currency,
        cached: true,
      };
    }

    const response = await listPaystackBanks(currency);

    banksCache.set(currency, { data: response.data, fetchedAt: now });

    return {
      success: true,
      data: response.data,
      currency,
      cached: false,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "List Paystack Banks", event);
  }
});
