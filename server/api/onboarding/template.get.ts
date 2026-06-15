import { utils, write } from "xlsx";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const workbook = utils.book_new();

  const sheets = [
    { name: "Company", headers: ["name", "slug", "status"] },
    { name: "Users", headers: ["email", "name", "password", "role", "image"] },
    { name: "Hostels", headers: ["name", "slug", "company", "address", "contactNumber", "email", "status", "supportEmail", "supportPhone", "joinCode"] },
    { name: "Rooms", headers: ["roomNumber", "hostelName", "company", "floor", "roomType", "allowedGender", "amountPerYear", "status", "features"] },
    { name: "Students", headers: ["userEmail", "company", "hostelName", "gender", "dateOfBirth", "phoneNumber", "address", "emergencyContactName", "emergencyContactPhone", "residencyStatus"] },
    { name: "Allocations", headers: ["studentEmail", "roomNumber", "hostelName", "company", "allocationDate", "academicPeriod", "academicYear", "status"] },
    { name: "Billing", headers: ["studentEmail", "allocationRef", "hostelName", "company", "amount", "billingType", "academicPeriod", "dueDate", "status"] },
    { name: "Admins", headers: ["userEmail", "phoneNumber", "department", "accessLevel", "hostelName", "company"] },
    { name: "Payments", headers: ["studentEmail", "billingRef", "amount", "reference", "paymentDate", "status"] },
    { name: "Visitors", headers: ["studentEmail", "visitorName", "email", "phoneNumber", "visitDate", "relationship", "purpose", "hostelName", "status"] },
    { name: "Complaints", headers: ["studentEmail", "hostelName", "roomNumber", "description", "priority", "type"] },
    { name: "MaintenanceRequests", headers: ["studentEmail", "hostelName", "roomNumber", "description", "issueType", "priority"] },
    { name: "Announcements", headers: ["title", "content", "priority", "targetAudience", "company", "hostelName", "roomNumber", "userEmail"] },
  ];

  for (const sheet of sheets) {
    const ws = utils.json_to_sheet([], { header: sheet.headers });
    utils.book_append_sheet(workbook, ws, sheet.name);
  }

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  setResponseHeader(event, "Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  setResponseHeader(event, "Content-Disposition", `attachment; filename="KayaNest_Onboarding_Template.xlsx"`);

  return buffer;
});
