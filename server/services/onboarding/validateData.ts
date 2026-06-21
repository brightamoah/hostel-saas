import { z } from "zod";

// Helper for dates coming from Excel (either numeric serial or ISO string)
const excelDateString = z.union([
  z.string(),
  z.number().transform(v => new Date((v - (25567 + 2)) * 86400 * 1000).toISOString().split("T")[0]),
  z.date().transform(d => d.toISOString().split("T")[0]),
]);

// Helper for strings/numbers coming from Excel that need to be parsed by strict string schemas
function excelStringPipe(schema: z.ZodType<any, string>) {
  return z.union([z.string(), z.number()]).transform(String).pipe(schema);
}
// Helper for numbers coming from Excel
const excelNumber = z.union([z.string(), z.number()]).transform(Number);

export const CompanySchema = z.object({
  name: excelStringPipe(nameSchema),
  slug: excelStringPipe(slugSchema),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UserSchema = z.object({
  email: emailSchema,
  name: excelStringPipe(nameSchema),
  password: excelStringPipe(passwordSchema),
  role: roleSchema,
  image: z.string().optional(),
});

export const HostelSchema = z.object({
  name: excelStringPipe(nameSchema),
  slug: excelStringPipe(slugSchema),
  company: z.string().min(1, "Company is required").optional(),
  address: excelStringPipe(addressSchema),
  contactNumber: excelStringPipe(phoneNumberSchema),
  email: emailSchema,
  status: z.enum(["active", "inactive"]).default("active"),
  supportEmail: z.union([emailSchema, z.literal("")]).optional(),
  supportPhone: z.union([excelStringPipe(phoneNumberSchema), z.literal("")]).optional(),
  joinCode: z.string().optional(),
});

export const RoomSchema = z.object({
  roomNumber: excelStringPipe(roomNumberSchema),
  hostelName: z.string().min(1, "Hostel name required"),
  company: z.string().min(1, "Company required").optional(),
  floor: excelNumber.pipe(z.number().min(1, "Floor cannot be negative")),
  roomType: z.enum(["single", "double", "triple", "quad"]),
  allowedGender: z.enum(["male", "female", "mixed", "unassigned"]),
  amountPerYear: excelNumber.pipe(z.number().min(1, "Amount per Year cannot be negative")),
  status: z.enum(["vacant", "fully occupied", "partially occupied", "under maintenance", "reserved"]).default("vacant"),
  capacity: excelNumber.pipe(z.number().min(1, "Capacity must be positive")).optional(),
  features: z.string().optional(),
});

export const StudentSchema = z.object({
  userEmail: emailSchema,
  company: z.string().optional(),
  hostelName: z.string().optional(),
  gender: z.enum(["male", "female"]),
  dateOfBirth: excelDateString,
  phoneNumber: excelStringPipe(phoneNumberSchema),
  address: excelStringPipe(addressSchema),
  emergencyContactName: excelStringPipe(nameSchema),
  emergencyContactPhone: excelStringPipe(phoneNumberSchema),
  residencyStatus: z.enum(["active", "inactive", "suspended", "graduated", "withdrawn"]).default("active"),
});

export const AllocationSchema = z.object({
  studentEmail: emailSchema,
  roomNumber: excelStringPipe(roomNumberSchema),
  hostelName: z.string().min(1, "Hostel required"),
  company: z.string().min(1, "Company required").optional(),
  allocationDate: excelDateString,
  academicPeriod: academicPeriodSchema,
  academicYear: academicYearSchema,
  status: z.enum(["active", "expired", "pending", "cancelled"]).default("active"),
});

export const BillingSchema = z.object({
  studentEmail: emailSchema,
  allocationRef: z.string().optional(),
  hostelName: z.string().min(1, "Hostel required"),
  company: z.string().min(1, "Company required").optional(),
  amount: excelNumber.pipe(z.number().positive("Amount must be positive")),
  billingType: billingTypeSchema,
  academicPeriod: academicPeriodSchema,
  dueDate: excelDateString,
  status: billingStatusSchema,
});

export const AdminSchema = z.object({
  userEmail: emailSchema,
  phoneNumber: excelStringPipe(phoneNumberSchema),
  department: z.string().min(1, "Department required"),
  accessLevel: z.enum(["regular", "super", "support"]),
  hostelName: z.string().optional(),
  company: z.string().optional(),
});

export const PaymentSchema = z.object({
  studentEmail: emailSchema,
  billingRef: z.string().optional(),
  amount: excelNumber.pipe(z.number().positive("Amount must be positive")),
  reference: z.string().min(1, "Payment reference required"),
  paymentDate: excelDateString,
  status: z.enum(["success", "pending", "failed"]),
});

export const VisitorSchema = z.object({
  studentEmail: emailSchema,
  visitorName: excelStringPipe(nameSchema),
  email: z.union([emailSchema, z.literal("")]).optional(),
  phoneNumber: excelStringPipe(phoneNumberSchema),
  visitDate: excelDateString,
  relationship: z.string().min(1, "Relationship required"),
  purpose: z.string().min(1, "Purpose required"),
  hostelName: z.string().min(1, "Hostel required"),
  status: z.enum(["pending", "approved", "denied", "checked-in", "checked-out", "cancelled"]).default("pending"),
});

export const ComplaintSchema = z.object({
  studentEmail: emailSchema,
  hostelName: z.string().min(1, "Hostel required"),
  roomNumber: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 chars"),
  priority: z.enum(["low", "medium", "high", "emergency"]),
  type: z.enum(["noise", "amenities", "billing issue", "room condition", "staff behavior", "security", "other"]),
});

export const MaintenanceRequestSchema = z.object({
  studentEmail: emailSchema,
  hostelName: z.string().min(1, "Hostel required"),
  roomNumber: excelStringPipe(roomNumberSchema),
  description: z.string().min(10, "Description must be at least 10 chars"),
  issueType: z.enum(["plumbing", "electrical", "appliance", "structural", "pest control", "other", "furniture", "cleaning", "internet/Wi-Fi"]),
  priority: z.enum(["low", "medium", "high", "emergency"]),
});

export const AnnouncementSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 chars"),
  content: z.string().min(10, "Content must be at least 10 chars"),
  priority: z.enum(["low", "medium", "high", "emergency"]),
  targetAudience: z.enum(["all", "students", "admins", "hostel", "room", "user"]),
  company: z.string().min(1, "Company required").optional(),
  hostelName: z.string().optional(),
  roomNumber: z.string().optional(),
  userEmail: z.union([emailSchema, z.literal("")]).optional(),
});

export function validateSheetData<T>(schema: z.ZodType<T>, rows: any[], required: boolean = false) {
  if (required && (!rows || rows.length === 0)) {
    return {
      valid: [],
      updated: [],
      skipped: [],
      invalid: [{
        row: 0,
        data: {},
        errors: [{ column: "Sheet", message: "This sheet is required but contains no valid data." }],
      }],
    };
  }

  const valid: T[] = [];
  const skipped: any[] = [];
  const invalid: { row: number; data: any; errors: { column: string; message: string }[] }[] = [];

  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    }
    else {
      invalid.push({
        row: index + 2, // Header offset
        data: row,
        errors: result.error.issues.map((e) => {
          const colName = e.path.join(".");
          return {
            column: colName,
            message: e.message,
          };
        }),
      });
    }
  });

  return {
    valid,
    updated: [],
    skipped,
    invalid,
  };
}
