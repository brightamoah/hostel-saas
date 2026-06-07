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

    return {
      success: true,
      message: "File parsed successfully",
      sheets: Object.keys(parsedData),
      data: parsedData,
      validation: validationResults,
    };
  }
  catch (error: any) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Preview Onboarding Data", event);
  }
});
