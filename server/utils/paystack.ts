import { Paystack } from "paystack-sdk";

export type SubAccount = {
  id: number;
  domain: string;
  subaccountCode: string;
  businessName: string;
  description?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  metadata: Record<string, unknown>;
  percentageCharge: number;
  isVerified: boolean;
  settlementBank: string;
  accountNumber: string;
  settlementSchedule: string;
  active: boolean;
  migrate: boolean;
  integration: number;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
};

/** Maps the raw SDK snake_case subaccount payload to our camelCase shape. */
function mapSubAccount(raw: Record<string, unknown>): SubAccount {
  return {
    id: raw.id as number,
    domain: raw.domain as string,
    subaccountCode: raw.subaccount_code as string,
    businessName: raw.business_name as string,
    description: raw.description as string | undefined,
    primaryContactName: raw.primary_contact_name as string | undefined,
    primaryContactEmail: raw.primary_contact_email as string | undefined,
    primaryContactPhone: raw.primary_contact_phone as string | undefined,
    metadata: (raw.metadata ?? {}) as Record<string, unknown>,
    percentageCharge: raw.percentage_charge as number,
    isVerified: raw.is_verified as boolean,
    settlementBank: raw.settlement_bank as string,
    accountNumber: raw.account_number as string,
    settlementSchedule: raw.settlement_schedule as string,
    active: raw.active as boolean,
    migrate: raw.migrate as boolean,
    integration: raw.integration as number,
    currency: raw.currency as string,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  };
}

let paystackClient: Paystack | null = null;

/**
 * Retrieves the singleton instance of the Paystack client.
 *
 * If the client has not been initialized yet, this function creates a new instance
 * using the Paystack secret key from the runtime configuration.
 *
 * @returns {Paystack} The initialized Paystack client instance.
 */
export function getPaystackClient(): Paystack {
  if (!paystackClient) {
    const config = useRuntimeConfig();
    paystackClient = new Paystack(config.paystackSecretKey);
  }
  return paystackClient;
}

/**
 * Initializes a transaction with Paystack.
 *
 * This function prepares a payment request by interacting with the Paystack API. It handles
 * currency conversion (multiplying amount by 100 for kobo/pesewas), sets default channels,
 * and passes the necessary metadata and callback URL.
 *
 * @param params - The configuration object for initializing the transaction.
 * @param params.email - The email address of the customer making the payment.
 * @param params.amount - The transaction amount in the base currency unit (e.g., GHS, NGN).
 *                        This value is automatically multiplied by 100 to convert to
 *                        the smallest currency unit (e.g., pesewas) before sending to Paystack.
 * @param params.reference - A unique string to identify this specific transaction.
 * @param params.currency - The currency code for the transaction (default: "GHS").
 * @param params.metadata - Optional key-value pairs to store additional data about the transaction.
 * @param params.channels - An optional array of payment channels to make available
 *                          (e.g., "card", "mobile_money"). Defaults to all major channels.
 * @param params.callbackUrl - The URL to redirect the user to after payment is attempted.
 *
 *  @param params.subaccountCode - Optional Paystack subaccount code (ACCT_xxxxx).
 *   When provided the payment is split; omit for master-account-only payments.
 * @param params.bearer - Who bears the Paystack transaction fee. Only relevant
 *   when subaccountCode is supplied. Defaults to "subaccount".
 *
 * @returns A promise that resolves to the Paystack initialization response, containing the authorization URL and access code.
 */
export async function initializePaystackTransaction(
  params: {
    email: string;
    amount: number;
    reference: string;
    currency?: string;
    metadata?: Record<string, string | number | boolean | object | []>;
    channels?: string[];
    callbackUrl?: string;
    subaccountCode?: string;
    bearer?: "account" | "subaccount";
  },
) {
  const paystack = getPaystackClient();

  const payload: Parameters<typeof paystack.transaction.initialize>[0] = {
    email: params.email,
    amount: Math.ceil(params.amount * 100).toString(),
    reference: params.reference,
    currency: params.currency || "GHS",
    metadata: params.metadata,
    channels: params.channels || [
      "card",
      "bank",
      "ussd",
      "qr",
      "mobile_money",
      "bank_transfer",
    ],
    callback_url: params.callbackUrl,
  };

  if (params.subaccountCode) {
    payload.subaccount = params.subaccountCode;
    payload.bearer = params.bearer ?? "subaccount";
  }

  return await paystack.transaction.initialize(payload);
}

/**
 * Verifies a transaction using the Paystack API given a transaction reference.
 *
 * @param reference - The unique transaction reference string generated by Paystack during initialization.
 * @returns A promise that resolves to the verification details of the transaction from Paystack.
 */
export async function verifyPaystackTransaction(reference: string) {
  const paystack = getPaystackClient();
  return await paystack.transaction.verify(reference);
}

/**
 * Returns the list of banks supported by Paystack for the given currency.
 * Cache the result in your application layer — this list rarely changes and
 * calling it on every page load is wasteful.
 *
 * @param currency - ISO currency code. Defaults to "GHS" (Ghana Cedis).
 */
export async function listPaystackBanks(currency = "GHS") {
  const paystack = getPaystackClient();
  return await paystack.misc.banks({
    currency,
    use_cursor: false,
    perPage: 100,
  });
}

/**
 * Resolves a bank account number to the account holder's name via Paystack.
 *
 * Use this to let admins confirm they entered the correct account before
 * creating a subaccount. The resolved name is shown in the UI for confirmation
 * but is NOT stored in the database — only the account number and bank code are.
 *
 * Security note: this endpoint is authenticated (uses your secret key) so it
 * must only ever be called server-side.
 *
 * @param accountNumber - The bank account number to verify.
 * @param bankCode      - The Paystack bank code (e.g. "030" for GCB in Ghana).
 * @returns Paystack resolve response containing `account_name` and `account_number`.
 */
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string,
) {
  const paystack = getPaystackClient();
  return await paystack.verification.resolveAccount({
    account_number: accountNumber,
    bank_code: bankCode,
  });
}

export type CreateSubaccountParams = {
  /** Name that appears on the Paystack dashboard for this subaccount. */
  businessName: string;
  /**
   * Bank Code for the bank.
   * You can get the list of Bank Codes by calling the List Banks endpoint.
   */
  settlementBank: string;
  /** Settlement account number. */
  accountNumber: string;
  /**
   * Percentage of each transaction routed to this subaccount.
   * Must be between 0 and 100. Use 100 to send the full amount.
   */
  percentageCharge: number;
  /** Optional human-readable description shown on the Paystack dashboard. */
  description?: string;

  /**
   * A name for the contact person for this subaccount
   */
  primaryContactName?: string;
  /**
   * A contact email for the subaccount
   */
  primaryContactEmail?: string;
  /**
   * A phone number to call for this subaccount
   */
  primaryContactPhone?: string;
  /**
   * Stringified JSON object.
   * Add a custom_fields attribute which has an
   * array of objects if you would like the
   * fields to be added to your transaction
   * when displayed on the dashboard.
   * Sample:
   * {
   *  "custom_fields": [
   *    {
   *      "display_name":"Cart ID",
   *      "variable_name": "cart_id",
   *         "value": "8393"
   *       }
   *     ]
   *   }
   */
  metadata?: string;
};

export type UpdateSubaccountParams = Partial<
  Omit<CreateSubaccountParams, "accountNumber" | "bankCode">
> & {
  /** Pass both accountNumber and bankCode together or neither — Paystack requires both to change bank details. */
  accountNumber?: string;
  bankCode?: string;
  /** Set to false to deactivate the subaccount on Paystack's side. */
  active?: boolean;
};

/**
 * Creates a new Paystack subaccount for a company or hostel.
 *
 * The returned `subaccount_code` (ACCT_xxxxx) and `id` must be persisted
 * in `company_settings.paystackSubaccountCode` / `paystackSubaccountId`
 * (or the hostel equivalent) immediately after this call succeeds.
 *
 * @throws Will throw if Paystack returns a non-success response so the caller
 *   can handle the error before writing anything to the database.
 */
export async function createPaystackSubaccount(params: CreateSubaccountParams) {
  const paystack = getPaystackClient();

  const paramItems: Parameters<typeof paystack.subAccount.create>[0] = {
    account_number: params.accountNumber,
    business_name: params.businessName,
    settlement_bank: params.settlementBank,
    percentage_charge: params.percentageCharge,
    description: params.description ?? "",
    metadata: params.metadata,
    primary_contact_email: params.primaryContactEmail,
    primary_contact_name: params.primaryContactName,
    primary_contact_phone: params.primaryContactPhone,
  };

  const response = await paystack.subAccount.create(paramItems);

  if (!response.status) {
    throw new Error(
      `Paystack subaccount creation failed: ${response.message ?? "unknown error"}`,
    );
  }

  return mapSubAccount(response.data as unknown as Record<string, unknown>);
}

/**
 * Updates an existing Paystack subaccount by its subaccount code (ACCT_xxxxx).
 *
 * Partial updates are supported — only pass the fields you want to change.
 * To change bank details, `accountNumber` and `bankCode` must be passed together.
 *
 * @throws Will throw if Paystack returns a non-success response.
 */
export async function updatePaystackSubaccount(
  subaccountCode: string,
  params: UpdateSubaccountParams,
) {
  const paystack = getPaystackClient();

  const payload: Partial<NonNullable<Parameters<typeof paystack.subAccount.update>[1]>> = {};

  if (params.businessName !== undefined) payload.business_name = params.businessName;
  if (params.percentageCharge !== undefined) payload.percentage_charge = params.percentageCharge;
  if (params.active !== undefined) (payload as any).active = params.active;
  if (params.description) payload.description = params.description;
  if (params.primaryContactName) payload.primary_contact_name = params.primaryContactName;
  if (params.primaryContactEmail) payload.primary_contact_email = params.primaryContactEmail;
  if (params.primaryContactPhone) payload.primary_contact_phone = params.primaryContactPhone;

  const hasBankChange = params.settlementBank || params.accountNumber;
  const hasBothBankFields = params.settlementBank && params.accountNumber;

  if (hasBankChange && !hasBothBankFields) {
    throw new Error(
      "Both settlementBank and accountNumber must be provided together when updating bank details.",
    );
  }

  if (hasBothBankFields) {
    payload.settlement_bank = params.settlementBank;
    payload.account_number = params.accountNumber;
  }

  const response = await paystack.subAccount.update(
    subaccountCode,
    payload as NonNullable<Parameters<typeof paystack.subAccount.update>[1]>,
  );

  if (!response.status) {
    throw new Error(
      `Paystack subaccount update failed: ${response.message ?? "unknown error"}`,
    );
  }

  if (!response.status || !response.data) {
    throw new Error(
      `Paystack subaccount update failed: ${response.message ?? "unknown error"}`,
    );
  }

  return mapSubAccount(response.data as unknown as Record<string, unknown>);
}

/**
 * Fetches a single subaccount by its subaccount code.
 * Useful for reconciliation or confirming live state on Paystack's side.
 */
export async function fetchPaystackSubaccount(subaccountCode: string): Promise<SubAccount> {
  const paystack = getPaystackClient();
  const response = await paystack.subAccount.fetch(subaccountCode);

  if (!response.status || !response.data) {
    throw new Error(
      `Paystack subaccount fetch failed: ${response.message ?? "unknown error"}`,
    );
  }

  return mapSubAccount(response.data as unknown as Record<string, unknown>);
}
