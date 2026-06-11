import { z } from "zod";

const companyIdSchema = z.number().int().positive();

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  requireCompanyRole(scope, ["owner", "admin"]);

  const companyId = companyIdSchema.parse(scope.companyId);

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
