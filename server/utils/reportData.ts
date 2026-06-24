import type { H3Event } from "h3";
import { reportQueries } from "../db/queries";

export async function fetchReportData(config: ReportConfigSchema, scope: AdminScope, event: H3Event) {
  const {
    getBillingReportData,
    getComplaintReportData,
    getMaintenanceReportData,
    getRoomReportData,
    getStudentReportData,
    getVisitorReportData,
    getUserReportData,
  } = await reportQueries(event);

  switch (config.module) {
    case "billing": return getBillingReportData(config, scope);
    case "rooms": return getRoomReportData(config, scope);
    case "student": return getStudentReportData(config, scope);
    case "visitor": return getVisitorReportData(config, scope);
    case "maintenanceRequest": return getMaintenanceReportData(config, scope);
    case "complaint": return getComplaintReportData(config, scope);
    case "user": return getUserReportData(config, scope);
    default:
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid report module",
      });
  }
}
