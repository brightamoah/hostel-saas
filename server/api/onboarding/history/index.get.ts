import { z } from "zod";

const companyIdSchema = z.number().int().positive();

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const query = getQuery(event);
  const rawCompanyId = scope.companyId ?? (query.companyId ? Number(query.companyId) : null);
  
  if (scope.isPlatformAdmin && !rawCompanyId) {
    return { success: true, history: [] };
  }

  const companyId = companyIdSchema.parse(rawCompanyId);
  const kv = useStorage("kv");

  const historyKey = onboardingHistoryKeySchema.parse(
    `onboarding:history:${companyId}`,
  );

  const history = await kv.getItem<any[]>(historyKey) || [];

  return {
    success: true,
    history,
  };
});
