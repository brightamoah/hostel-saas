import { CalendarDate, getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { z } from "zod";

import { formatBytes } from "@/utils/formatBytes";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MIN_DIMENSIONS = { width: 200, height: 200 };
const MAX_DIMENSIONS = { width: 4096, height: 4096 };
const MAX_FILES = 3;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
];

const mediaFileSchema = z
  .instanceof(File, {
    error: "Please select a file.",
  })
  .superRefine((file: File, ctx) => {
    if (file.size > MAX_FILE_SIZE) {
      ctx.addIssue({
        code: "custom",
        message: `"${file.name}" is too large. Maximum file size is ${formatBytes(MAX_FILE_SIZE)}.`,
      });
    }

    if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
      ctx.addIssue({
        code: "custom",
        message: `"${file.name}" has an unsupported type (${file.type}). Allowed: JPG, PNG, WebP, MP4, MOV.`,
      });
    }

    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();

        reader.onerror = () => {
          ctx.addIssue({
            code: "custom",
            message: `Unable to read "${file.name}". Please choose a different file.`,
          });
          resolve();
        };

        reader.onload = (e) => {
          const result = e.target?.result;

          if (typeof result !== "string") {
            ctx.addIssue({
              code: "custom",
              message: `Unable to process "${file.name}".`,
            });
            resolve();
            return;
          }

          const img = new Image();

          img.onerror = () => {
            ctx.addIssue({
              code: "custom",
              message: `"${file.name}" is not a valid image file.`,
            });
            resolve();
          };

          img.onload = () => {
            const isWithinBounds
              = img.width >= MIN_DIMENSIONS.width
                && img.height >= MIN_DIMENSIONS.height
                && img.width <= MAX_DIMENSIONS.width
                && img.height <= MAX_DIMENSIONS.height;

            if (!isWithinBounds) {
              ctx.addIssue({
                code: "custom",
                message: `"${file.name}" dimensions must be between ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height} and ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height} pixels.`,
              });
            }

            resolve();
          };

          img.src = result;
        };

        reader.readAsDataURL(file);
      });
    }

    if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return new Promise<void>((resolve) => {
        const video = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);

        video.preload = "metadata";

        video.onerror = () => {
          ctx.addIssue({
            code: "custom",
            message: `"${file.name}" is not a valid video file.`,
          });
          URL.revokeObjectURL(objectUrl);
          resolve();
        };

        video.onloadedmetadata = () => {
          const hasValidMetadata
            = Number.isFinite(video.duration)
              && video.duration > 0
              && video.videoWidth > 0
              && video.videoHeight > 0;

          if (!hasValidMetadata) {
            ctx.addIssue({
              code: "custom",
              message: `Unable to process "${file.name}" as a valid video.`,
            });
          }

          URL.revokeObjectURL(objectUrl);
          resolve();
        };

        video.src = objectUrl;
      });
    }
  });

export const imageFileSchema = z
  .instanceof(File, {
    error: "Please select an image file.",
  })
  .refine(file => file.size <= MAX_FILE_SIZE, {
    message: `The image is too large. Please choose an image smaller than ${formatBytes(MAX_FILE_SIZE)}.`,
  })
  .refine(file => ACCEPTED_IMAGE_TYPES.includes(file.type), {
    message: "Please upload a valid image file (JPEG, PNG, or WebP).",
  })
  .refine(
    file =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || typeof FileReader === "undefined") {
          return resolve(true);
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const meetsDimensions
              = img.width >= MIN_DIMENSIONS.width
                && img.height >= MIN_DIMENSIONS.height
                && img.width <= MAX_DIMENSIONS.width
                && img.height <= MAX_DIMENSIONS.height;
            resolve(meetsDimensions);
          };
          img.onerror = () => resolve(false);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      }),
    {
      message: `The image dimensions are invalid. Please upload an image between ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height} and ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height} pixels.`,
    },
  );

export const profilePictureSchema = imageFileSchema;
export type ProfilePictureSchema = z.output<typeof profilePictureSchema>;

const linkSchema = z.object({
  link: z.url("Invalid URL").nonempty("Link is required"),
  isOpen: z.boolean().default(false),
});

export const slugSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 20 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be letters, numbers, hyphens and kebab-case (e.g., my-company)");

export type LinkSchema = z.output<typeof linkSchema>;

export function createIdSchema(name: string) {
  return z.number(`${name} ID is required`)
    .int()
    .positive()
    .min(1, `Invalid ${name} ID`);
}

const passwordSchema = z.string("Password is required").trim().superRefine((val, ctx) => {
  if (!val?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Password is required",
    });
    return;
  }

  if (val.length < 8) {
    ctx.addIssue({
      code: "custom",
      message: "Must be at least 8 characters",
    });
    return;
  }

  if (val.length > 20) {
    ctx.addIssue({
      code: "custom",
      message: "Must be at most 20 characters",
    });
    return;
  }

  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({
      code: "custom",
      message: "Must include an uppercase letter",
    });
    return;
  }

  if (!/[a-z]/.test(val)) {
    ctx.addIssue({
      code: "custom",
      message: "Must include a lowercase letter",
    });
    return;
  }

  if (!/\d/.test(val)) {
    ctx.addIssue({
      code: "custom",
      message: "Must include a number",
    });
    return;
  }

  if (!/[^A-Z0-9]/i.test(val)) {
    ctx.addIssue({
      code: "custom",
      message: "Must include a special character",
    });
  }
});

const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .nonempty("Name is required")
  .min(5, "Name must be at least 5 characters long")
  .max(60, "Name must be at most 60 characters long")
  .refine(
    val => /^[a-z\s]+$/i.test(val),
    "Name can only contain letters and spaces",
  );

const roleSchema = z.enum(["student", "admin"], {
  error: "Role must be either 'student' or 'admin'",
});

const rememberMeSchema = z.boolean().optional().default(false);

const emailSchema = z.email({
  error: issue =>
    issue.input === undefined || issue.input === ""
      ? "Email is required"
      : "Invalid email address",
});

const confirmPasswordSchema = z.string({ error: "Confirm Password is required" });

const baseSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const signupSchema = baseSignupSchema.extend({
  confirmPassword: confirmPasswordSchema,
}).refine(data => data.password === data.confirmPassword, {
  error: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupSchema = z.output<typeof signupSchema>;

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: rememberMeSchema,
});

export type LoginSchema = z.output<typeof loginSchema>;

const verifyEmailSchema = z.object({
  email: emailSchema,
});
export type VerifyEmailSchema = z.output<typeof verifyEmailSchema>;

const phoneNumberSchema = z.string().superRefine((val, ctx) => {
  if (!val?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Phone Number is required",
    });
    return;
  }

  if (!/^(?:\+233\d{9}|0\d{9})$/.test(val)) {
    ctx.addIssue({
      code: "custom",
      message: "Phone number must be in the format +233XXXXXXXXX or 0XXXXXXXXXX",
    });
  }
});

const genderSchema
  = z.enum(["male", "female", "mixed", "unassigned"], {
    error: "Gender is required",
  });

const addressSchema = z
  .string()
  .trim()
  .min(5, "Address is too short")
  .max(120, "Address is too long")
  .regex(/^(?!.*([._/-])\1)[\w\s,./-]+$/, "Repeated special characters are not allowed")
  .regex(/[a-z]/i, "Address must contain at least one letter");

const idSchema = z.int().min(10000000, "Invalid id: less than required length").max(99999999, "Invalid id: exceeds maximum length");

export type IDSchema = z.output<typeof idSchema>;

const personalDetailsSchema = z.object({
  gender: z.enum(["male", "female"], "Gender is required"),
  dateOfBirth: z.date({ error: "Date of Birth is required" }).nullable(),
  phoneNumber: phoneNumberSchema,
  address: addressSchema,
  emergencyContactName: nameSchema,
  emergencyContactPhoneNumber: phoneNumberSchema,
  emergencyContactEmail: emailSchema,
  healthConditions: z.string().optional(),
  hostelSlug: slugSchema.optional(),
});

export type PersonalDetailsSchema = z.output<typeof personalDetailsSchema>;

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: confirmPasswordSchema,
}).refine(data => data.newPassword === data.confirmPassword, {
  error: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordSchema = z.output<typeof resetPasswordSchema>;

const passwordResetSchema = z.object({
  token: z.string({ error: "Token is required" }),
  newPassword: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: confirmPasswordSchema,
})
  .refine(data => data.newPassword !== data.currentPassword, {
    error: "New password must be different from current password",
    path: ["newPassword"],
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    error: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordSchema = z.output<typeof changePasswordSchema>;

const emailVerificationSchema = z.object({
  id: idSchema,
  token: z.uuidv4({ error: "Valid token is required" }),
});

const roomTypeSchema
  = z.enum(["single", "double", "triple", "quad"], {
    error: "Room Type is required",
  });

const roomStatusSchema
  = z.enum(["vacant", "fully occupied", "partially occupied", "under maintenance", "reserved"], {
    error: "Status is required",
  });

const roomNumberSchema = z
  .string()
  .trim()
  .nonempty("Room number is required")
  .min(4, "Room number must be at least 4 characters long (e.g., A100)")
  .max(10, "Room number cannot exceed 10 characters")
  .regex(/^[A-Z]\d+$/, "Room number must start with a single uppercase letter followed by numbers (e.g., V103).")
  .refine((val) => {
    const numberPart = Number.parseInt(val.substring(1), 10);
    return numberPart >= 1;
  }, "The number part of the room number must be 100 or greater.");

const roomFeatureSchema = z.union([
  z.string("Features is required")
    .trim()
    .nonempty("Features is required")
    .refine(s => s.split(",").map(item => item.trim()).filter(Boolean).length > 0, "Features is required")
    .transform(s => s.split(",").map(item => item.trim()).filter(Boolean)),
  z.array(z.string("Features is required").nonempty("Features is required")),
]).refine(arr => arr.length > 0, { message: "Features is required" });

export const addRoomSchema = z.object({
  roomNumber: roomNumberSchema,
  hostelId: createIdSchema("Hostel"),
  floor: z.number("Floor is required").min(1, "Floor cannot be negative"),
  capacity: z.number("Capacity is required").min(1, "Capacity must be at least 1").max(4, "Capacity cannot exceed 4"),
  roomType: roomTypeSchema,
  features: roomFeatureSchema,
  amountPerYear: z.number("Amount per Year is required").min(1, "Amount per Year cannot be negative"),
  status: roomStatusSchema,
  allowedGender: genderSchema,
  currentOccupancy: z.number("Current Occupancy is required").min(0, "Current Occupancy cannot be negative").max(4, "Current Occupancy cannot exceed 4"),
});

const editRoomData = addRoomSchema.partial().omit({ roomType: true, status: true, allowedGender: true });

const editRoomSchema = z.object({
  roomId: createIdSchema("Room"),
  data: editRoomData.extend({
    status: z.enum(["vacant", "fully occupied", "partially occupied", "under maintenance", "reserved"], "Status is required").optional(),
    roomType: z.enum(["single", "double", "triple", "quad"], "Room Type is required").optional(),
    allowedGender: z.enum(["male", "female"], "Allowed Gender is required").optional(),
  }),
});

export type AddRoomSchema = z.output<typeof addRoomSchema>;
export type AddRoomSchemaInput = z.input<typeof addRoomSchema>;
export type RoomFormState = Omit<AddRoomSchemaInput, "features"> & {
  features: string;
};
export type EditRoomDataSchema = z.output<typeof editRoomData>;
export type EditRoomSchema = z.output<typeof editRoomSchema>;

const deleteItemSchema = z.object({
  ids: z.array(z.number().min(1, "Invalid room ID")).min(1, "At least one room ID is required"),
});

export type DeleteItemSchema = z.output<typeof deleteItemSchema>;

const accessLevelSchema
  = z.enum(["regular", "super", "support"], "Access Level is required");

const hostelIdSchema = z.number("Hostel ID is required").min(1, "Hostel ID must be at least 1").positive().nullable().optional();

const departmentSchema = z.string("Department is required")
  .min(2, "Department must be at least 2 characters long")
  .max(100, "Department must be at most 100 characters long");

const companyRoleSchema = z.enum([
  "owner",
  "admin",
  "finance",
  "support",
  "staff",
], "Company Role is required");

const addAdminSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  role: z.literal("admin", "Role must be 'admin'"),
  department: departmentSchema,
  accessLevel: accessLevelSchema,
  hostelId: hostelIdSchema,
  companyRole: companyRoleSchema,
});

export type AddAdminSchema = z.output<typeof addAdminSchema>;

const promoteDemoteSchema = z.object({
  userId: idSchema,
  action: z.enum(["promote", "demote"], "Action must be either 'promote' or 'demote'"),
  accessLevel: accessLevelSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  department: departmentSchema.optional(),
  hostelId: hostelIdSchema.nullable(),
});

export type PromoteDemoteSchema = z.output<typeof promoteDemoteSchema>;

const approveDenySchema = z.object({
  visitorId: createIdSchema("Visitor"),
  status: z.enum(["approved", "denied"], "Status must be either 'approved' or 'denied'"),
});

export type ApproveDenySchema = z.output<typeof approveDenySchema>;

const logActionSchema = z.object({
  visitorId: createIdSchema("Visitor"),
  action: z.enum(["check_in", "check_out"], "Action must be either 'check_in' or 'check_out'"),
});
export type LogActionSchema = z.output<typeof logActionSchema>;

const relationshipSchema = z.string("Relationship is required")
  .trim()
  .nonempty("Relationship is required")
  .min(2, "Relationship must be at least 2 characters long")
  .max(50, "Relationship must be at most 50 characters long");

const purposeOfVisitSchema = z.string("Purpose of Visit is required")
  .trim()
  .nonempty("Purpose of Visit is required")
  .min(2, "Purpose of Visit must be at least 2 characters long")
  .max(50, "Purpose of Visit must be at most 50 characters long");

const visitorStatusSchema = z.enum(
  ["pending", "approved", "denied", "checked-in", "checked-out", "cancelled"],
  {
    error: "Status is required",
  },
).optional().default("pending");

const dateSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      return parseDate(val);
    }
    catch {
      return val;
    }
  }

  if (val && typeof val === "object" && "year" in val && "month" in val && "day" in val) {
    const d = val as { year: number; month: number; day: number };
    try {
      return new CalendarDate(d.year, d.month, d.day);
    }
    catch {
      return val;
    }
  }

  return val;
}, z.custom<CalendarDate>((val) => {
  if (val instanceof CalendarDate) return true;

  return (
    val !== null
    && typeof val === "object"
    && "calendar" in val
    && "era" in val
    && "year" in val
    && "month" in val
    && "day" in val
  );
}, "Invalid date format"));

const dateNoPastSchema = dateSchema.refine((date) => {
  if (!date) return false;

  const now = today(getLocalTimeZone());
  return date.compare(now) >= 0;
}, "Date cannot be in the past");

const registerVisitorSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  visitDate: dateNoPastSchema,
  relationship: relationshipSchema,
  purpose: purposeOfVisitSchema,
  hostelId: createIdSchema("Hostel"),
  studentId: createIdSchema("Student"),
  status: visitorStatusSchema,
});

const editVisitorSchema = z.object({
  visitorId: createIdSchema("Visitor"),
  data: registerVisitorSchema.omit({ hostelId: true, studentId: true, status: true }).partial(),
});

export type EditVisitorSchema = z.output<typeof editVisitorSchema>;

export type RegisterVisitorSchema = z.output<typeof registerVisitorSchema>;

export const REPORT_MODULES = [
  "billing",
  "payment",
  "rooms",
  "allocation",
  "student",
  "visitor",
  "maintenanceRequest",
  "complaint",
  "user",
] as const;
export type ReportModule = typeof REPORT_MODULES[number];

export const sortDirSchema = z.enum(["asc", "desc"]);

export const reportConfigSchema = z.object({
  type: z.enum(["custom", "prebuilt"]),
  module: z.enum(REPORT_MODULES),
  fields: z.array(z.string()).min(1, "At least one field must be selected"),
  statusFilter: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  sortBy: z.string().optional(),
  sortDir: sortDirSchema.optional().default("asc"),
  groupBy: z.string().optional(),
});

export type ReportConfigSchema = z.output<typeof reportConfigSchema>;

export const createReportTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  module: reportConfigSchema.shape.module,
  config: reportConfigSchema,
});

export type CreateReportTemplateSchema = z.output<typeof createReportTemplateSchema>;

const maintenanceStatusSchema = z.union([
  z.enum([
    "pending",
    "assigned",
    "in-progress",
    "completed",
    "rejected",
  ], {
    error: "Status must be one of 'pending', 'assigned', 'in-progress', 'completed', 'rejected'",
  }),
  z.literal(""),
]).refine(val => val !== "", "Status is required");

const responseText = z
  .string()
  .trim()
  .nonempty("Response Text is required")
  .min(10, "Response is too short")
  .max(400, "Response Text cannot exceed 400 characters");

const maintenanceStatusResponseSchema = z.object({
  maintenanceId: createIdSchema("Maintenance"),
  status: maintenanceStatusSchema,
  responseText,
});

export type MaintenanceStatusResponseSchema = z.output<typeof maintenanceStatusResponseSchema>;

const maintenanceIssueTypeSchema = z.union([
  z.enum([
    "plumbing",
    "electrical",
    "appliance",
    "structural",
    "pest control",
    "other",
    "furniture",
    "cleaning",
    "internet/Wi-Fi",
  ], {
    error: "Issue Type is required",
  }),
  z.literal(""),
]).refine(val => val !== "", "Issue Type is required");

const prioritySchema = z.union([
  z.enum([
    "low",
    "medium",
    "high",
    "emergency",
  ], "Priority is required"),
  z.literal(""),
]).refine(val => val !== "", "Priority is required");

export const maintenanceMediaSchema = z
  .array(mediaFileSchema)
  .max(MAX_FILES, `You can upload a maximum of ${MAX_FILES} files.`)
  .optional()
  .default([]);

export type MaintenanceMediaSchema = z.output<typeof maintenanceMediaSchema>;

export const mediaAttachmentSchema = z.object({
  url: z.url("Invalid attachment URL"),
  type: z.enum(["image", "video"], { error: "Media type must be 'image' or 'video'" }),
  name: z.string().nonempty("File name is required"),
  size: z.number().positive("File size must be positive"),
});

export const apiCreateMaintenanceSchema = z.object({
  hostelId: createIdSchema("Hostel"),
  roomId: createIdSchema("Room"),
  studentId: createIdSchema("Student"),
  description: z.string()
    .nonempty("Description is required")
    .min(10, "Description must be at least 10 characters long")
    .max(200, "Description cannot exceed 200 characters"),
  issueType: maintenanceIssueTypeSchema,
  priority: prioritySchema,
  mediaAttachments: z.array(mediaAttachmentSchema).optional().default([]),
});

export type ApiCreateMaintenanceSchema = z.output<typeof apiCreateMaintenanceSchema>;

const createMaintenanceSchema = apiCreateMaintenanceSchema.extend({
  mediaAttachments: maintenanceMediaSchema,
});

export type CreateMaintenanceSchema = z.output<typeof createMaintenanceSchema>;

const editMaintenanceSchema = z.object({
  maintenanceId: createIdSchema("Maintenance"),
  studentId: createIdSchema("Student"),
  data: apiCreateMaintenanceSchema.partial().omit({ studentId: true }),
});

export type EditMaintenanceSchema = z.output<typeof editMaintenanceSchema>;

const complaintTypeSchema
  = z.enum([
    "noise",
    "amenities",
    "billing issue",
    "room condition",
    "staff behavior",
    "security",
    "other",
  ], "Complaint Type is required");

const createComplaintSchema = z.object({
  hostelId: createIdSchema("Hostel"),
  roomId: createIdSchema("Room").optional().nullable(),
  studentId: createIdSchema("Student"),
  description: z.string()
    .trim()
    .nonempty("Description is required")
    .min(10, "Description must be at least 10 characters long")
    .max(200, "Description cannot exceed 200 characters"),
  priority: prioritySchema,
  type: complaintTypeSchema,
});

export type CreateComplaintSchema = z.output<typeof createComplaintSchema>;

const editComplaintSchema = z.object({
  complaintId: createIdSchema("Complaint"),
  studentId: createIdSchema("Student"),
  data: createComplaintSchema.omit({ studentId: true, hostelId: true }).partial(),
});

export type EditComplaintSchema = z.output<typeof editComplaintSchema>;

const complaintStatusSchema = z.union([
  z.enum([
    "pending",
    "in-progress",
    "resolved",
    "rejected",
  ], {
    error: "Status must be one of 'pending', 'in-progress', 'resolved', 'rejected'",
  }),
  z.literal(""),
]).refine(val => val !== "", "Status is required");

const complaintStatusResponseSchema = z.object({
  complaintId: createIdSchema("Complaint"),
  status: complaintStatusSchema,
  responseText,
});

export type ComplaintStatusResponseSchema = z.output<typeof complaintStatusResponseSchema>;

export const announcementPrioritySchema = z.union([
  z.enum([
    "low",
    "medium",
    "high",
    "emergency",
  ]),
  z.literal(""),
]).refine(val => val !== "", "Priority is required");
export const targetAudienceSchema = z.union([
  z.enum([
    "all",
    "students",
    "admins",
    "hostel",
    "room",
    "user",
  ]),
  z.literal(""),
]).refine(val => val !== "", "Target Audience is required");

export const createAnnouncementSchema = z.object({
  title: z.string()
    .nonempty("Title is required")
    .min(5, "Title must be at least 5 characters long")
    .max(200, "Title cannot exceed 200 characters"),
  content: z.string()
    .nonempty("Content is required")
    .min(10, "Content must be at least 10 characters long")
    .max(5000, "Content cannot exceed 5000 characters"),
  priority: announcementPrioritySchema,
  targetAudience: targetAudienceSchema,
  targetHostelId: createIdSchema("Target Hostel").optional(),
  targetRoomId: createIdSchema("Target Room").optional(),
  targetUserId: createIdSchema("Target User").optional(),
  companyId: createIdSchema("Company").optional(),
}).superRefine((data, ctx) => {
  if (data.targetAudience === "hostel" && !data.targetHostelId) {
    ctx.addIssue({
      code: "custom",
      message: "Target Hostel ID is required when target audience is 'hostel'",
      path: ["targetHostelId"],
    });
  }

  if (data.targetAudience === "room" && !data.targetRoomId) {
    ctx.addIssue({
      code: "custom",
      message: "Target Room ID is required when target audience is 'room'",
      path: ["targetRoomId"],
    });
  }

  if (data.targetAudience === "user" && !data.targetUserId) {
    ctx.addIssue({
      code: "custom",
      message: "Target User ID is required when target audience is 'user'",
      path: ["targetUserId"],
    });
  }
});

export type CreateAnnouncementSchema = z.output<typeof createAnnouncementSchema>;

const readStatusSchema = z.object({
  action: z.enum(["read", "unread"], "Action must be either 'read' or 'unread'"),
});

export type ReadStatusSchema = z.output<typeof readStatusSchema>;

const editAnnouncementData = z.object(createAnnouncementSchema.shape).omit({ priority: true, targetAudience: true }).partial();

const editAnnouncementSchema = z.object({
  announcementId: createIdSchema("Announcement"),
  data: editAnnouncementData.extend({
    priority: z.enum([
      "low",
      "medium",
      "high",
      "emergency",
    ], "Priority is required").optional(),

    targetAudience: z.enum([
      "all",
      "students",
      "admins",
      "hostel",
      "room",
      "user",
    ], "Target Audience is required").optional(),
  }),
  resetReadStatus: z.boolean().optional().default(false),
});

export type EditAnnouncementSchema = z.output<typeof editAnnouncementSchema>;

const academicPeriodSchema = z.enum([
  "first semester",
  "second semester",
  "entire year",
  "vacation period",
], "Academic period is required");

const academicYearSchema = z
  .string()
  .regex(/^\d{4}\/\d{4}$/, "Academic year must be in format YYYY/YYYY (e.g.2025/2026)");

const bookRoomSchema = z.object({
  roomId: createIdSchema("Room"),
  userId: createIdSchema("User"),
  endDate: z.date().optional(),
  academicPeriod: academicPeriodSchema,
  academicYear: academicYearSchema,
});

export type BookRoomSchema = z.output<typeof bookRoomSchema>;

const billingStatusSchema = z.enum([
  "unpaid",
  "fully paid",
  "partially paid",
  "overdue",
  "cancelled",
], "Billing status is required");

const billingTypeSchema = z.enum([
  "hostel fee",
  "security deposit",
  "utility fee",
  "maintenance fee",
  "late payment penalty",
  "other",
], "Billing type is required");

const paymentTermsSchema = z.enum([
  "Net 15 Days",
  "Net 30 Days",
  "Net 45 Days",
  "Immediate Payment",
], "Payment Terms is required");

const createBillingSchema = z.object({
  studentId: createIdSchema("Student"),
  amount: z.number("Amount is required").min(1, "Amount must be at least 1"),
  dueDate: dateNoPastSchema,
  description: z.string(),
  type: billingTypeSchema,
  academicPeriod: academicPeriodSchema,
  paymentTerms: paymentTermsSchema.optional(),
  sendNotification: z.boolean().default(false),
});

export type CreateBillingSchema = z.output<typeof createBillingSchema>;

const emailInvoiceSchema = z.object({
  studentEmail: emailSchema,
  studentName: nameSchema,
  invoiceNumber: z.string().nonempty("Invoice Number is required"),
  studentUserId: createIdSchema("Student User"),
  amountTotal: z.number("Amount Total is required").min(0, "Amount Total cannot be negative"),
  amountPaid: z.number("Amount Paid is required").min(0, "Amount Paid cannot be negative"),
  amountDue: z.number("Amount Due is required").min(0, "Amount Due cannot be negative"),
  dateIssued: z.string().nonempty("Date Issued is required"),
  dateDue: z.string().nonempty("Date Due is required"),
  amount: z.number("Amount is required").min(0, "Amount cannot be negative"),
});
export type EmailInvoiceSchema = z.output<typeof emailInvoiceSchema>;

const paymentStatusSchema = z.enum([
  "completed",
  "failed",
  "pending",
  "refunded",
], "Payment status is required");
export type PaymentStatusSchema = z.output<typeof paymentStatusSchema>;

const paymentMethodSchema = z.enum([
  "card",
  "mobile money",
  "bank transfer",
  "cash",
  "other",
], "Payment method is required");

export type PaymentMethodSchema = z.output<typeof paymentMethodSchema>;

const paymentSchema = z.object({
  billingId: createIdSchema("Billing"),
  amount: z.number("Amount is required").min(1, "Amount must be at least 1"),
  totalAmount: z.number("Total Amount is required").positive(),
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
}).superRefine((data, ctx) => {
  const { amount, totalAmount } = data;

  if (amount > totalAmount) {
    ctx.addIssue({
      code: "custom",
      message: `Amount cannot exceed the total amount (GH₵${totalAmount})`,
      path: ["amount"],
    });
    return;
  }

  const balance = totalAmount - amount;

  if (balance > 0 && balance < 1) {
    ctx.addIssue({
      code: "custom",
      message: "Remaining balance cannot be less than 1. Please pay the full amount or reduce the payment.",
      path: ["amount"],
    });
  }
});

export type PaymentSchema = z.output<typeof paymentSchema>;

const recordManualPaymentSchema = z.object({
  billingId: createIdSchema("Billing"),
  amount: z.number("Amount is required").min(1, "Amount must be at least 1"),
  totalAmount: z.number("Total Amount is required").positive(),
  paymentMethod: paymentMethodSchema,
  transactionReference: z.string().trim().min(1, "Reference is required"),
  paymentDate: z.string().refine(date => new Date(date) <= new Date(), "Payment date cannot be in the future"),
}).superRefine((data, ctx) => {
  const { amount, totalAmount } = data;

  if (amount > totalAmount) {
    ctx.addIssue({
      code: "custom",
      message: `Amount cannot exceed the total amount (GH₵${totalAmount})`,
      path: ["amount"],
    });
    return;
  }

  const balance = totalAmount - amount;

  if (balance > 0 && balance < 1) {
    ctx.addIssue({
      code: "custom",
      message: "Remaining balance cannot be less than 1. Please pay the full amount or reduce the payment.",
      path: ["amount"],
    });
  }
});

export type RecordManualPaymentSchema = z.output<typeof recordManualPaymentSchema>;

const referenceSchema = z.string()
  .nonempty("Reference is required")
  .regex(
    /^KH-\d+-.*$/,
    "Reference must be in the format KH-{billingId}-{hashOrUuid}",
  );

const verifyPaymentSchema = z.object({
  billingId: createIdSchema("Billing"),
  reference: referenceSchema,
});

export type VerifyPaymentSchema = z.output<typeof verifyPaymentSchema>;

export const inviteCompanyMemberSchema = z.object({
  companyId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.enum(["owner", "admin", "finance", "support", "staff"]),
});

const joinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6, "Join code must be at least 6 characters")
  .max(8, "Join code must be at most 10 characters")
  .regex(/^[A-Z0-9]+$/, "Join code can only contain letters and numbers and must be uppercase");

export type InviteCompanyMemberSchema = z.output<typeof inviteCompanyMemberSchema>;

const ownerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
  confirmPassword: confirmPasswordSchema,
}).refine(data => data.password === data.confirmPassword, {
  error: "Passwords don't match",
  path: ["confirmPassword"],
});

const hostelDetailsSchema = z.object({
  name: z.string().trim().min(2, "Hostel name is required"),
  slug: slugSchema,
  supportEmail: emailSchema,
  supportPhone: phoneNumberSchema,
  address: addressSchema,
  logo: imageFileSchema.optional(),
  logoUrl: z.string(),
  logoKey: z.string(),
  joinCode: joinCodeSchema,
});

export type HostelDetailsSchema = z.output<typeof hostelDetailsSchema>;

const companySchema = z.object({
  companyName: z.string().trim().min(3, "Company name is required").max(120),
  companySlug: slugSchema,
  createHostelNow: z.boolean().default(true),

  hostelName: hostelDetailsSchema.shape.name.optional(),
  hostelSlug: hostelDetailsSchema.shape.slug.optional(),
  supportEmail: hostelDetailsSchema.shape.supportEmail.optional(),
  supportPhone: hostelDetailsSchema.shape.supportPhone.optional(),
  hostelAddress: hostelDetailsSchema.shape.address.optional(),
  hostelLogo: hostelDetailsSchema.shape.logo.optional(),
  hostelLogoUrl: hostelDetailsSchema.shape.logoUrl.optional(),
  hostelLogoKey: hostelDetailsSchema.shape.logoKey.optional(),
  joinCode: hostelDetailsSchema.shape.joinCode.optional(),
}).superRefine((data, ctx) => {
  if (data.createHostelNow) {
    if (!data.hostelName || data.hostelName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Hostel name is required",
        path: ["hostelName"],
      });
    }

    if (!data.hostelSlug || data.hostelSlug.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Hostel slug is required",
        path: ["hostelSlug"],
      });
    }

    if (!data.supportEmail || data.supportEmail.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Support email is required",
        path: ["supportEmail"],
      });
    }

    if (!data.supportPhone || data.supportPhone.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Support phone number is required",
        path: ["supportPhone"],
      });
    }

    if (!data.joinCode || data.joinCode.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Join code is required",
        path: ["joinCode"],
      });
    }
  }
});

const registerCompanySchema = ownerSchema.and(companySchema);

export type RegisterCompanySchema = z.output<typeof registerCompanySchema>;

const updatePhoneNumberSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
});

export type UpdatePhoneNumberSchema = z.output<typeof updatePhoneNumberSchema>;

export const onboardingHistoryKeySchema = z.templateLiteral([
  "onboarding:history:",
  z.number(),
]);

export const onboardingDetailKeySchema = z.templateLiteral([
  "onboarding:details:",
  z.number(),
]);

export const residencyResetPreview = z.object({
  hostelId: hostelIdSchema.nonoptional(),
  academicPeriod: academicPeriodSchema.optional(),
  academicYear: academicYearSchema.optional(),
});

const residencyResetSchema = z.object({
  hostelId: hostelIdSchema.nonoptional(),
  academicPeriod: academicPeriodSchema,
  academicYear: academicYearSchema,
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});

export type ResidencyResetSchema = z.output<typeof residencyResetSchema>;

const residencyResetRollback = z.object({
  batchId: z.uuidv4("Invalid batch id"),
});

export type ResidencyResetRollbackSchema = z.output<typeof residencyResetRollback>;

export const checkoutStudent = z.object({
  hostelId: hostelIdSchema.nonoptional(),
  studentId: createIdSchema("Student"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
  reason: z.string().optional(),
});

export type CheckoutStudentSchema = z.output<typeof checkoutStudent>;

export {
  academicPeriodSchema,
  academicYearSchema,
  addAdminSchema,
  addressSchema,
  approveDenySchema,
  baseSignupSchema,
  billingStatusSchema,
  billingTypeSchema,
  bookRoomSchema,
  changePasswordSchema,
  companySchema,
  complaintStatusResponseSchema,
  confirmPasswordSchema,
  createBillingSchema,
  createComplaintSchema,
  createMaintenanceSchema,
  deleteItemSchema,
  editAnnouncementSchema,
  editComplaintSchema,
  editMaintenanceSchema,
  editRoomSchema,
  editVisitorSchema,
  emailInvoiceSchema,
  emailSchema,
  emailVerificationSchema,
  hostelDetailsSchema,
  joinCodeSchema,
  linkSchema,
  logActionSchema,
  loginSchema,
  maintenanceStatusResponseSchema,
  nameSchema,
  ownerSchema,
  passwordResetSchema,
  passwordSchema,
  paymentMethodSchema,
  paymentSchema,
  paymentStatusSchema,
  personalDetailsSchema,
  phoneNumberSchema,
  promoteDemoteSchema,
  readStatusSchema,
  recordManualPaymentSchema,
  registerCompanySchema,
  registerVisitorSchema,
  rememberMeSchema,
  resetPasswordSchema,
  residencyResetRollback,
  residencyResetSchema,
  roleSchema,
  roomFeatureSchema,
  roomNumberSchema,
  signupSchema,
  updatePhoneNumberSchema,
  verifyEmailSchema,
  verifyPaymentSchema,
};
