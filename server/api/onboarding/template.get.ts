import XlsxPopulate from "xlsx-populate";
import { companyQueries } from "~~/server/db/queries/company";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const query = getQuery(event);
  const rawCompanyId = scope.companyId ?? (query.companyId ? Number(query.companyId) : null);

  if (scope.isPlatformAdmin && !rawCompanyId) {
    throw createError({ statusCode: 400, message: "companyId query parameter is required for platform admins" });
  }

  const { getCompanyById } = await companyQueries(event);
  const currentCompany = await getCompanyById(rawCompanyId!);

  const templateData = await useStorage("assets:server").getItemRaw("templates:HMS_Onboarding_Template.xlsx");

  if (!templateData) {
    throw createError({ statusCode: 500, message: "Template file could not be found in assets." });
  }

  const workbook = await XlsxPopulate.fromDataAsync(templateData);

  const companySheet = workbook.sheet("Company");
  if (companySheet && currentCompany) {
    companySheet.cell("A2").value(currentCompany.name);
    companySheet.cell("B2").value(currentCompany.slug);
    companySheet.cell("C2").value(currentCompany.status);
  }

  const buffer = await workbook.outputAsync();

  setResponseHeader(event, "Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  setResponseHeader(event, "Content-Disposition", `attachment; filename="KayaNest_Onboarding_Template.xlsx"`);

  return buffer;
});
