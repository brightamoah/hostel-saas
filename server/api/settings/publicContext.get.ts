import { companyQueries, userQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const session = await requirePortalUserSession(event);
  const user = session.user;

  try {
    const { getStudentForDashboardByUserId } = await userQueries(event);

    // Only fetch student data if the user is actually a student
    let hostelId: number | undefined;
    if (user.role === "student") {
      const studentData = await getStudentForDashboardByUserId(user.id);
      const allocation = studentData?.studentRecordWithBestAllocation?.allocation;
      hostelId = allocation?.room?.hostel?.id;
    }
    else {
      hostelId = user.adminData?.hostelId ?? undefined;
    }

    const companyId = user.companyId;

    if (!companyId) {
      return {
        success: true,
        data: null,
      };
    }

    const { getPublicTenantContext } = await companyQueries(event);

    const { cSettings, hSettings } = await getPublicTenantContext(companyId, hostelId);

    const payload = {
      branding: {
        logoUrl: hSettings?.logoUrl || cSettings?.logoUrl,
        primaryColor: hSettings?.primaryColor || cSettings?.primaryColor,
        accentColor: hSettings?.accentColor || cSettings?.accentColor,
        supportEmail: hSettings?.supportEmail || cSettings?.supportEmail,
        supportPhone: hSettings?.supportPhone || cSettings?.supportPhone,
      },
      portal: {
        allowStudentSelfCheckout: cSettings?.allowStudentSelfCheckout ?? true,
        allowStudentViewRoommates: cSettings?.allowStudentViewRoommates ?? true,
        allowStudentMaintenanceRequests: cSettings?.allowStudentMaintenanceRequests ?? true,
        allowStudentComplaints: cSettings?.allowStudentComplaints ?? true,
        studentPortalMessage: cSettings?.studentPortalMessage,
      },
      billing: {
        defaultAcademicYear: cSettings?.defaultAcademicYear,
        defaultAcademicPeriod: cSettings?.defaultAcademicPeriod,
        allowPartialPayments: cSettings?.allowPartialPayments,
        minimumPartialPaymentPercent: cSettings?.minimumPartialPaymentPercent,
        accountName: hSettings?.paystackBusinessName ?? cSettings?.paystackBusinessName,
        accountNumber: hSettings?.paystackAccountNumber ?? cSettings?.paystackAccountNumber,
        bankName: hSettings?.paystackBankCode ?? cSettings?.paystackBankCode,
        // invoiceDueDays: cSettings?.invoiceDueDays,
        // autoSendInvoices: cSettings?.autoSendInvoices,
        // lateFeeEnabled: cSettings?.lateFeeEnabled,
        // lateFeeType: cSettings?.lateFeeType,
        // lateFeeValue: cSettings?.lateFeeValue,
        // lateFeeGracePeriodDays: cSettings?.lateFeeGracePeriodDays,
        // notifyOnPayment: cSettings?.notifyOnPayment,
        // notifyOnOverdue: cSettings?.notifyOnOverdue,
        // notifyOnAllocation: cSettings?.notifyOnAllocation,
        // notifyOnMaintenance: cSettings?.notifyOnMaintenance,
        // overdueReminderDays: cSettings?.overdueReminderDays,
      },
      operations: hSettings
        ? {
            checkInTime: hSettings.checkInTime,
            checkOutTime: hSettings.checkOutTime,
            visitorPolicy: hSettings.visitorPolicy,
            quietHoursStart: hSettings.quietHoursStart,
            quietHoursEnd: hSettings.quietHoursEnd,
            wifiAvailable: hSettings.wifiAvailable,
            wifiDetails: hSettings.wifiDetails,
          }
        : null,
      hostelId: hostelId || null,
      companyId,
    };

    return {
      success: true,
      data: payload,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Public Context", event);
  }
});
