import { compareOnboardingData } from "~~/server/services/onboarding/compareOnboardingData";
import { parseExcelBuffer } from "~~/server/services/onboarding/parseExcel";
import {
  AdminSchema,
  AllocationSchema,
  AnnouncementSchema,
  BillingSchema,
  CompanySchema,
  ComplaintSchema,
  HostelSchema,
  MaintenanceRequestSchema,
  PaymentSchema,
  RoomSchema,
  StudentSchema,
  UserSchema,
  validateSheetData,
  VisitorSchema,
} from "~~/server/services/onboarding/validateData";
import { Buffer } from "node:buffer";
import { randomUUID } from "uncrypto";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  // Read File from FormData
  const formData = await readFormData(event);
  const file = formData.get("file") as File;

  if (!file) {
    throw createError({ statusCode: 400, message: "No file uploaded" });
  }

  // Parse Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const parsedData = parseExcelBuffer(buffer);

    // Run Validation
    const validationResults = {
      Company: validateSheetData(CompanySchema, parsedData.Company || [], false),
      Users: validateSheetData(UserSchema, parsedData.Users || [], false),
      Hostels: validateSheetData(HostelSchema, parsedData.Hostels || [], false),
      Rooms: validateSheetData(RoomSchema, parsedData.Rooms || [], false),
      Students: validateSheetData(StudentSchema, parsedData.Students || [], false),
      Allocations: validateSheetData(AllocationSchema, parsedData.Allocations || [], false),
      Billing: validateSheetData(BillingSchema, parsedData.Billing || [], false),
      Admins: validateSheetData(AdminSchema, parsedData.Admins || [], false),
      Payments: validateSheetData(PaymentSchema, parsedData.Payments || [], false),
      Visitors: validateSheetData(VisitorSchema, parsedData.Visitors || [], false),
      Complaints: validateSheetData(ComplaintSchema, parsedData.Complaints || [], false),
      MaintenanceRequests: validateSheetData(MaintenanceRequestSchema, parsedData.MaintenanceRequests || [], false),
      Announcements: validateSheetData(AnnouncementSchema, parsedData.Announcements || [], false),
    };

    const query = getQuery(event);
    const rawCompanyId = scope.companyId ?? (query.companyId ? Number(query.companyId) : null);
    
    if (scope.isPlatformAdmin && !rawCompanyId) {
      throw createError({ statusCode: 400, message: "companyId query parameter is required for platform admins" });
    }

    const companyId = rawCompanyId!;
    const comparedResults = await compareOnboardingData(companyId, validationResults);

    const uploadId = randomUUID();
    const kv = useStorage("kv");

    await kv.setItem(`onboarding:details:${uploadId}`, comparedResults, { ttl: 86400 });

    // Compute summary counts
    const summary: Record<string, { valid: number; updated: number; skipped: number; invalid: number }> = {};

    for (const [sheet, data] of Object.entries(comparedResults)) {
      summary[sheet] = {
        valid: data.valid?.length || 0,
        updated: data.updated?.length || 0,
        skipped: data.skipped?.length || 0,
        invalid: data.invalid?.length || 0,
      };
    }

    const historyKey = `onboarding:history:${companyId}`;
    const existingHistory = await kv.getItem<any[]>(historyKey) || [];
    const newHistoryItem = {
      id: uploadId,
      companyId,
      fileName: file.name,
      createdAt: new Date().toISOString(),
      status: "pending",
      summary,
    };
    await kv.setItem(historyKey, [newHistoryItem, ...existingHistory]);

    return {
      success: true,
      message: "File parsed successfully",
      uploadId,
      sheets: Object.keys(parsedData),
      data: parsedData,
      validation: comparedResults,
    };
  }
  catch (error: any) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Preview Onboarding Data", event);
  }
});
