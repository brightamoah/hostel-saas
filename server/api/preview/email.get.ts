import { roomQueries } from "~~/server/db/queries";
import { getBillingTemplate, getEmailTemplate, getResetPasswordTemplate, getWelcomeAdminTemplate } from "~~/shared/utils/emailTemplate";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { getHostelByIdScoped } = await roomQueries();

  const config = useRuntimeConfig();

  const { hostelId } = scope;

  if (!hostelId) {
    throw createError({
      statusCode: 403,
      message: "No assigned hostel or insufficient permission.",
    });
  }

  const hostel = await getHostelByIdScoped(hostelId, scope);

  if (!hostel) {
    throw createError({
      statusCode: 404,
      message: "Hostel not found.",
    });
  }

  const templates = {
    "verify": () =>
      getEmailTemplate("https://kayanest.app/auth/verify?token=preview-token-abc123", {
        name: "Ama Owusu",
        email: "ama@example.com",
      } as any, hostel.name!).htmlTemplate,

    "reset": () =>
      getResetPasswordTemplate(
        "https://kayanest.app/auth/reset-password?token=preview-token-xyz789",
        "Ama Owusu",
        hostel.name!,
      ).html,

    "welcome-admin": () =>
      getWelcomeAdminTemplate(
        "Kofi Mensah",
        "kofi@kayanest.app",
        "•••••••••••",
        hostel.name!,
        config.public.adminBaseUrl,
      ).html,

    "invoice": () => getBillingTemplate({
      studentName: "Bright Amoah",
      amount: "GHS 1,200.00",
      dueDate: "September 30, 2024",
      purpose: "Hostel accommodation for September 2024",
      hostelName: hostel.name!,
      dashboardUrl: config.public.siteBaseUrl,
      invoiceNumber: `INV-${Math.floor(Math.random() * 900000 + 100000)}`,
      supportEmail: "support@kayanest.app",
    }).html,
  };

  type TemplateKey = keyof typeof templates;

  const query = getQuery(event);
  const key = (query.template as TemplateKey) ?? "verify";

  if (!(key in templates)) {
    setResponseStatus(event, 400);
    return `Unknown template "${key}". Available: ${Object.keys(templates).join(", ")}`;
  }

  setResponseHeader(event, "Content-Type", "text/html; charset=utf-8");
  return templates[key]();
});
