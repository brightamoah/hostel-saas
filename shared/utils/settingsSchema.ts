import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color (e.g. #1A2B3C)")
  .optional();

const urlField = z.url("Must be a valid URL").optional();

const emailField = emailSchema.optional();

const phoneField = phoneNumberSchema.optional();

export const companyGeneralSettingsSchema = z.object({
  logoUrl: urlField,
  faviconUrl: urlField,
  primaryColor: hexColor,
  accentColor: hexColor,
  companyWebsite: urlField,
  supportEmail: emailField,
  supportPhone: phoneField,
  billingEmail: emailField,
  invoiceFooterText: z.string().max(1000).optional(),
  termsUrl: urlField,
  privacyUrl: urlField,
  studentPortalMessage: z.string().max(2000).optional(),
});

export const companyBillingSettingsSchema = z.object({
  lateFeeEnabled: z.boolean(),
  lateFeeType: z.enum(["flat", "percent"], "Late fee type is required"),
  lateFeeFrequency: z.enum(["one-time", "daily", "weekly", "monthly"], "Late fee frequency is required"),
  lateFeeValue: z.number().min(0).max(1_000_000),
  lateFeeGracePeriodDays: z.number().int().min(0).max(365),
  autoSendInvoices: z.boolean(),
  invoiceDueDays: z.number().int().min(1).max(365),
  allowPartialPayments: z.boolean(),
  minimumPartialPaymentPercent: z.number().min(0).max(100),
});

export const companyNotificationSettingsSchema = z.object({
  notifyOnPayment: z.boolean(),
  notifyOnOverdue: z.boolean(),
  notifyOnAllocation: z.boolean(),
  notifyOnMaintenance: z.boolean(),
  notifyOnUpcoming: z.boolean(),
  overdueReminderDays: z
    .array(z.number().int().min(1).max(365))
    .max(10, "Maximum 10 reminder intervals"),
  upcomingReminderDays: z
    .array(z.number().int().min(0).max(365))
    .max(10, "Maximum 10 reminder intervals"),
});

export const companyPortalSettingsSchema = z.object({
  allowStudentSelfCheckout: z.boolean(),
  allowStudentViewRoommates: z.boolean(),
  allowStudentMaintenanceRequests: z.boolean(),
  allowStudentComplaints: z.boolean(),
});

export const companyAcademicSettingsSchema = z.object({
  defaultAcademicYear: academicYearSchema,
  defaultAcademicPeriod: academicPeriodSchema,
});

export const upsertCompanySettingsSchema = z
  .object({})
  .extend(companyGeneralSettingsSchema.partial().shape)
  .extend(companyBillingSettingsSchema.partial().shape)
  .extend(companyNotificationSettingsSchema.partial().shape)
  .extend(companyPortalSettingsSchema.partial().shape)
  .extend(companyAcademicSettingsSchema.partial().shape);

/**
 * Settlement account type.
 *
 * "bank_account"  — traditional bank account number.
 *                   Ghana: 13 digits. Nigeria: 10 digits.
 * "mobile_money"  — mobile money wallet identified by phone number.
 *                   Ghana (MTN/Telecel/etc): 10 digits, e.g. 0241234567.
 *
 * Paystack's subaccount API accepts both via the same `account_number` field.
 * The distinction is stored here so the UI renders the right label and the
 * server applies the correct length validation per type.
 */
export const paystackAccountTypeEnum = z.enum(["bank_account", "mobile_money"]);
export type PaystackAccountType = z.infer<typeof paystackAccountTypeEnum>;

export const verifyBankAccountSchema = z.object({
  accountType: paystackAccountTypeEnum,
  accountNumber: z
    .string()
    .regex(/^\d+$/, "Account number must contain digits only")
    .min(10, "Account number must be at least 10 digits")
    .max(13, "Account number must be at most 13 digits"),

  bankCode: z.string("Bank Code is required").min(2, "Bank Code must be at least 2 characters").max(10, "Bank Code must be at most 10 characters"),
}).refine(
  (data) => {
    if (data.accountType === "mobile_money") return data.accountNumber.length === 10;
    return data.accountNumber.length === 10 || data.accountNumber.length === 13;
  },
).superRefine((data, ctx) => {
  const isMobileMoney = data.accountType === "mobile_money";
  const length = data.accountNumber.length;

  if (isMobileMoney && length !== 10) {
    ctx.addIssue({
      code: "custom",
      message: "Mobile money number must be exactly 10 digits (e.g. 0241234567)",
      path: ["accountNumber"],
    });
  }
  else if (!isMobileMoney && length !== 10 && length !== 13) {
    ctx.addIssue({
      code: "custom",
      message: "Bank account number must be either 10 or 13 digits",
      path: ["accountNumber"],
    });
  }

  if (isMobileMoney) {
    const mobileMoneyRegex = /^[A-Z]{2,3}$/;
    if (!mobileMoneyRegex.test(data.bankCode)) {
      ctx.addIssue({
        code: "custom",
        message: "Mobile money code must be 2-3 uppercase letters (e.g., MTN, ATL, VOD)",
        path: ["bankCode"],
      });
    }
  }
  else {
    if (!/^\d+$/.test(data.bankCode)) {
      ctx.addIssue({
        code: "custom",
        message: "Bank code must contain digits only",
        path: ["bankCode"],
      });
    }
  }
});

export const createSubaccountSchema = z.object({
  accountType: paystackAccountTypeEnum,
  businessName: z
    .string("Business Name is required")
    .min(2, "Business Name must be at least 2 characters")
    .max(255, "Business Name must be at most 255 characters"),
  settlementBank: z.string("Settlement Bank is required").min(2, "Settlement Bank must be at least 2 characters").max(10, "Settlement Bank must be at most 10 characters"),
  accountNumber: z
    .string("Account number is required")
    .min(10, "Account number must be at least 10 digits")
    .max(13, "Account number must be at most 13 digits")
    .regex(/^\d+$/, "Account number must contain digits only"),
  percentageCharge: z.number("Percentage charge is required").int("Percentage charge must be a whole number (e.g. 0, 5, 100)").min(0, "Percentage charge must be at least 0").max(100, "Percentage charge must be at most 100"),
  description: z.string("Description is required").min(2, "Description must be at least 2 characters").max(500, "Description must be at most 500 characters").optional(),
  primaryContactName: z.string("Primary Contact Name is required").min(2, "Primary Contact Name must be at least 2 characters").max(255, "Primary Contact Name must be at most 255 characters").optional(),
  primaryContactEmail: z.email("Invalid email address").optional(),
  primaryContactPhone: z.string("Primary Contact Phone is required").min(2, "Primary Contact Phone must be at least 2 characters").max(30, "Primary Contact Phone must be at most 30 characters").optional(),
}).superRefine((data, ctx) => {
  const isMobileMoney = data.accountType === "mobile_money";
  const length = data.accountNumber.length;

  if (isMobileMoney && length !== 10) {
    ctx.addIssue({
      code: "custom",
      message: "Mobile money number must be exactly 10 digits (e.g. 0241234567)",
      path: ["accountNumber"],
    });
  }
  else if (!isMobileMoney && length !== 10 && length !== 13) {
    ctx.addIssue({
      code: "custom",
      message: "Bank account number must be either 10 or 13 digits",
      path: ["accountNumber"],
    });
  }

  if (isMobileMoney) {
    const mobileMoneyRegex = /^[A-Z]{2,3}$/;
    if (!mobileMoneyRegex.test(data.settlementBank)) {
      ctx.addIssue({
        code: "custom",
        message: "Mobile money code must be 2-3 uppercase letters (e.g., MTN, ATL, VOD)",
        path: ["settlementBank"],
      });
    }
  }
});

export type CreateSubaccountSchema = z.output<typeof createSubaccountSchema>;

export const updateSubaccountSchema = z.object({
  businessName: z.string().min(2).max(255).optional(),
  percentageCharge: z.number().int("Percentage charge must be a whole number").min(0).max(100).optional(),
  description: z.string().max(500).optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.email().optional(),
  primaryContactPhone: z.string().max(30).optional(),
  settlementBank: z.string().min(2).max(10).optional(),
  accountNumber: z
    .string()
    .min(10)
    .max(13)
    .regex(/^\d+$/)
    .optional(),
  accountType: paystackAccountTypeEnum.optional(),
  active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const count = [data.settlementBank, data.accountNumber, data.accountType].filter(Boolean).length;

  if (count > 0 && count < 3) {
    ctx.addIssue({
      code: "custom",
      message: "To update bank details, settlementBank, accountNumber, and accountType must all be provided",
      path: ["settlementBank"],
    });
  }

  if (data.accountType && data.accountNumber && data.settlementBank) {
    const isMobileMoney = data.accountType === "mobile_money";
    const length = data.accountNumber?.length;

    if (isMobileMoney && length !== 10) {
      ctx.addIssue({
        code: "custom",
        message: "Mobile money number must be exactly 10 digits (e.g. 0241234567)",
        path: ["accountNumber"],
      });
    }
    else if (!isMobileMoney && length !== 10 && length !== 13) {
      ctx.addIssue({
        code: "custom",
        message: "Bank account number must be either 10 or 13 digits",
        path: ["accountNumber"],
      });
    }

    if (isMobileMoney) {
      const mobileMoneyRegex = /^[A-Z]{2,3}$/;
      if (!mobileMoneyRegex.test(data.settlementBank)) {
        ctx.addIssue({
          code: "custom",
          message: "Mobile money code must be 2-3 uppercase letters (e.g., MTN, ATL, VOD)",
          path: ["settlementBank"],
        });
      }
    }
    else if (!/^\d+$/.test(data.settlementBank)) {
      ctx.addIssue({
        code: "custom",
        message: "Bank code must contain digits only",
        path: ["settlementBank"],
      });
    }
  }
});

export const hostelBrandingSchema = z.object({
  logoUrl: urlField,
  primaryColor: hexColor,
  accentColor: hexColor,
  supportEmail: emailField,
  supportPhone: phoneField,
});

export type HostelBrandingSchema = z.output<typeof hostelBrandingSchema>;

export const hostelPoliciesSchema = z.object({
  genderPolicy: z.enum(["per_room", "hostel_wide"], "Invalid gender policy").optional(),
  hostelGender: z.enum(["male", "female", "mixed", "unassigned"], "Invalid hostel gender").optional(),
  visitorPolicy: z.string("Visitor policy required").max(2000).optional(),
  maxVisitorsPerRoom: z.number().int().min(0).max(100).optional(),
  quietHoursStart: z
    .string("Quiet hours start time required")
    .regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format")
    .optional(),
  quietHoursEnd: z
    .string("Quiet hours end time required")
    .regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format")
    .optional(),
});

export type HostelPoliciesSchema = z.output<typeof hostelPoliciesSchema>;

export const hostelOperationsSchema = z.object({
  checkInTime: z
    .string("Check-in time required")
    .regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format")
    .optional(),
  checkOutTime: z
    .string("Check-out time required")
    .regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format")
    .optional(),
  wifiAvailable: z.boolean().optional(),
  wifiDetails: z.string().max(500).optional(),
  parkingAvailable: z.boolean().optional(),
  parkingDetails: z.string().max(500).optional(),

});

export type HostelOperationsSchema = z.output<typeof hostelOperationsSchema>;

export const hostelAmenitiesSchema = z.object({
  amenities: z.array(z.string("Amenity name required").max(100)).optional(),
});

export type HostelAmenitiesSchema = z.output<typeof hostelAmenitiesSchema>;

export const upsertHostelSettingsSchema = z.object({})
  .extend(hostelBrandingSchema.partial().shape)
  .extend(hostelPoliciesSchema.partial().shape)
  .extend(hostelOperationsSchema.partial().shape)
  .extend(hostelAmenitiesSchema.partial().shape)
  .refine(data => !(data.genderPolicy === "hostel_wide" && !data.hostelGender), {
    message: "hostelGender is required when genderPolicy is hostel_wide",
    path: ["hostelGender"],
  });

export const hostelSubaccountToggleSchema = z.object({
  useHostelSubaccount: z.boolean(),
});

export type UpsertHostelSettingsSchema = z.output<typeof upsertHostelSettingsSchema>;
export type UpdateSubaccountSchema = z.output<typeof updateSubaccountSchema>;

export type VerifyBankAccountSchema = z.output<typeof verifyBankAccountSchema>;

export type UpsertCompanySettingsSchema = z.output<typeof upsertCompanySettingsSchema>;

export type CompanyGeneralSettingsSchema = z.output<typeof companyGeneralSettingsSchema>;

export type CompanyBillingSettingsSchema = z.output<typeof companyBillingSettingsSchema>;

export type CompanyNotificationSettingsSchema = z.output<typeof companyNotificationSettingsSchema>;

export type CompanyPortalSettingsSchema = z.output<typeof companyPortalSettingsSchema>;

export type CompanyAcademicSettingsSchema = z.output<typeof companyAcademicSettingsSchema>;
export type HostelSubaccountToggleSchema = z.output<typeof hostelSubaccountToggleSchema>;
