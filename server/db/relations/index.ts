import { defineRelations } from "drizzle-orm";

import * as schema from "../schema";

export const relations = defineRelations(schema, r => ({
  admin: {
    company: r.one.company({
      from: r.admin.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.admin.hostelId,
      to: r.hostel.id,
    }),
    user: r.one.user({
      from: r.admin.userId,
      to: r.user.id,
    }),
    announcements: r.many.announcement(),
    auditLogs: r.many.auditLog(),
    notificationsActorAdminId: r.many.notification({
      alias: "notification_actorAdminId_admin_id",
    }),
    notificationsViaNotificationRead: r.many.notification({
      from: r.admin.id.through(r.notificationRead.adminId),
      to: r.notification.id.through(r.notificationRead.notificationId),
      alias: "admin_id_notification_id_via_notificationRead",
    }),
    visitors: r.many.visitor(),
    visitorLogs: r.many.visitorLogs(),
  },
  company: {
    admins: r.many.admin(),
    allocations: r.many.allocation(),
    announcements: r.many.announcement(),
    announcementReads: r.many.announcementReads(),
    auditLogs: r.many.auditLog(),
    billings: r.many.billing(),
    users: r.many.user({
      from: r.company.id.through(r.companyMember.companyId),
      to: r.user.id.through(r.companyMember.userId),
    }),
    complaints: r.many.complaint(),
    complaintResponses: r.many.complaintResponse(),
    hostels: r.many.hostel({
      alias: "hostel_companyId_company_id",
    }),
    maintenanceRequests: r.many.maintenanceRequest(),
    maintenanceResponses: r.many.maintenanceResponse(),
    members: r.many.companyMember(),
    notifications: r.many.notification(),
    payments: r.many.payment(),
    hostelsViaRoom: r.many.hostel({
      from: r.company.id.through(r.room.companyId),
      to: r.hostel.id.through(r.room.hostelId),
      alias: "company_id_hostel_id_via_room",
    }),
    students: r.many.student(),
    visitors: r.many.visitor(),
    visitorLogs: r.many.visitorLogs(),
    settings: r.one.companySettings({
      from: r.company.id,
      to: r.companySettings.companyId,
    }),
    reportTemplates: r.many.reportTemplate(),
  },
  companySettings: {
    company: r.one.company({
      from: r.companySettings.companyId,
      to: r.company.id,
    }),
  },
  companyMember: {
    company: r.one.company({
      from: r.companyMember.companyId,
      to: r.company.id,
    }),
    user: r.one.user({
      from: r.companyMember.userId,
      to: r.user.id,
    }),
  },
  hostel: {
    allocations: r.many.allocation({
      from: r.hostel.id,
      to: r.allocation.hostelId,
    }),
    admins: r.many.admin(),
    announcements: r.many.announcement(),
    auditLogs: r.many.auditLog(),
    billings: r.many.billing(),
    complaints: r.many.complaint(),
    company: r.one.company({
      from: r.hostel.companyId,
      to: r.company.id,
      alias: "hostel_companyId_company_id",
    }),
    maintenanceRequests: r.many.maintenanceRequest(),
    notifications: r.many.notification(),
    companies: r.many.company({
      alias: "company_id_hostel_id_via_room",
    }),
    students: r.many.student(),
    visitors: r.many.visitor(),
    rooms: r.many.room(),
    settings: r.one.hostelSettings({
      from: r.hostel.id,
      to: r.hostelSettings.hostelId,
    }),
  },
  hostelSettings: {
    hostel: r.one.hostel({
      from: r.hostelSettings.hostelId,
      to: r.hostel.id,
    }),
    company: r.one.company({
      from: r.hostelSettings.companyId,
      to: r.company.id,
    }),
  },
  user: {
    student: r.one.student({
      from: r.user.id,
      to: r.student.userId,
    }),
    admin: r.one.admin({
      from: r.user.id,
      to: r.admin.userId,
    }),
    announcements: r.many.announcement(),
    announcementReads: r.many.announcementReads(),
    auditLogs: r.many.auditLog(),
    notifications: r.many.notification(),
    billings: r.many.billing({
      from: r.user.id.through(r.student.userId),
      to: r.billing.studentId.through(r.student.id),
    }),
    admins: r.many.admin({
      from: r.user.id,
      to: r.admin.userId,
    }),
    authHandoffTokens: r.many.authHandoffToken(),
    companies: r.many.company(),
    complaintResponses: r.many.complaintResponse({
      from: r.user.id,
      to: r.complaintResponse.responderId,
    }),
    loginAttempts: r.many.loginAttempts(),
    maintenanceResponses: r.many.maintenanceResponse({
      from: r.user.id,
      to: r.maintenanceResponse.responderId,
    }),
    students: r.many.student({
      from: r.user.id,
      to: r.student.userId,
    }),
    payments: r.many.payment({
      from: r.user.id.through(r.student.userId),
      to: r.payment.studentId.through(r.student.userId),
    }),
    visitors: r.many.visitor({
      from: r.user.id.through(r.student.userId),
      to: r.visitor.studentId.through(r.student.userId),
    }),
    visitorLogs: r.many.visitorLogs({
      from: r.user.id.through(r.visitor.studentId),
      to: r.visitorLogs.visitorId.through(r.visitor.studentId),
    }),
    reportTemplates: r.many.reportTemplate({
      from: r.user.id,
      to: r.reportTemplate.userId,
      alias: "reportTemplate_userId_user_id",
    }),
  },
  allocation: {
    company: r.one.company({
      from: r.allocation.companyId,
      to: r.company.id,
    }),
    room: r.one.room({
      from: r.allocation.roomId,
      to: r.room.id,
    }),
    student: r.one.student({
      from: r.allocation.studentId,
      to: r.student.id,
    }),
    billings: r.many.billing(),
    hostel: r.one.hostel({
      from: r.allocation.hostelId,
      to: r.hostel.id,
    }),
  },
  room: {
    allocations: r.many.allocation(),
    announcements: r.many.announcement(),
    company: r.one.company({
      from: r.room.companyId,
      to: r.company.id,
    }),
    complaints: r.many.complaint(),
    hostel: r.one.hostel({
      from: r.room.hostelId,
      to: r.hostel.id,
    }),
    maintenanceRequests: r.many.maintenanceRequest(),
  },
  student: {
    allocations: r.many.allocation(),
    billings: r.many.billing(),
    complaints: r.many.complaint(),
    maintenanceRequests: r.many.maintenanceRequest(),
    payments: r.many.payment(),
    company: r.one.company({
      from: r.student.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.student.hostelId,
      to: r.hostel.id,
    }),
    user: r.one.user({
      from: r.student.userId,
      to: r.user.id,
    }),
    visitors: r.many.visitor({
      from: r.student.id,
      to: r.visitor.studentId,
    }),
  },
  announcement: {
    company: r.one.company({
      from: r.announcement.companyId,
      to: r.company.id,
    }),
    admin: r.one.admin({
      from: r.announcement.postedBy,
      to: r.admin.id,
    }),
    hostel: r.one.hostel({
      from: r.announcement.targetHostelId,
      to: r.hostel.id,
    }),
    room: r.one.room({
      from: r.announcement.targetRoomId,
      to: r.room.id,
    }),
    user: r.one.user({
      from: r.announcement.targetUserId,
      to: r.user.id,
    }),
    announcementReads: r.many.announcementReads(),
  },
  announcementReads: {
    announcement: r.one.announcement({
      from: r.announcementReads.announcementId,
      to: r.announcement.id,
    }),
    company: r.one.company({
      from: r.announcementReads.companyId,
      to: r.company.id,
    }),
    user: r.one.user({
      from: r.announcementReads.userId,
      to: r.user.id,
    }),
  },
  auditLog: {
    admin: r.one.admin({
      from: r.auditLog.actorAdminId,
      to: r.admin.id,
    }),
    user: r.one.user({
      from: r.auditLog.actorUserId,
      to: r.user.id,
    }),
    company: r.one.company({
      from: r.auditLog.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.auditLog.hostelId,
      to: r.hostel.id,
    }),
  },
  authHandoffToken: {
    user: r.one.user({
      from: r.authHandoffToken.userId,
      to: r.user.id,
    }),
  },
  billing: {
    allocation: r.one.allocation({
      from: r.billing.allocationId,
      to: r.allocation.id,
    }),
    company: r.one.company({
      from: r.billing.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.billing.hostelId,
      to: r.hostel.id,
    }),
    student: r.one.student({
      from: r.billing.studentId,
      to: r.student.id,
    }),
    payments: r.many.payment(),
  },
  complaint: {
    company: r.one.company({
      from: r.complaint.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.complaint.hostelId,
      to: r.hostel.id,
    }),
    room: r.one.room({
      from: r.complaint.roomId,
      to: r.room.id,
    }),
    student: r.one.student({
      from: r.complaint.studentId,
      to: r.student.id,
    }),
    responses: r.many.complaintResponse(),
  },
  complaintResponse: {
    company: r.one.company({
      from: r.complaintResponse.companyId,
      to: r.company.id,
    }),
    complaint: r.one.complaint({
      from: r.complaintResponse.complaintId,
      to: r.complaint.id,
    }),
    responder: r.one.user({
      from: r.complaintResponse.responderId,
      to: r.user.id,
      alias: "responderId_user_id",
    }),
  },
  loginAttempts: {
    user: r.one.user({
      from: r.loginAttempts.userId,
      to: r.user.id,
    }),
  },
  maintenanceRequest: {
    company: r.one.company({
      from: r.maintenanceRequest.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.maintenanceRequest.hostelId,
      to: r.hostel.id,
    }),
    room: r.one.room({
      from: r.maintenanceRequest.roomId,
      to: r.room.id,
    }),
    student: r.one.student({
      from: r.maintenanceRequest.studentId,
      to: r.student.id,
    }),
    responses: r.many.maintenanceResponse(),
  },
  maintenanceResponse: {
    company: r.one.company({
      from: r.maintenanceResponse.companyId,
      to: r.company.id,
    }),
    maintenanceRequest: r.one.maintenanceRequest({
      from: r.maintenanceResponse.maintenanceRequestId,
      to: r.maintenanceRequest.id,
    }),
    responder: r.one.user({
      from: r.maintenanceResponse.responderId,
      to: r.user.id,
      alias: "responderId_user_id",
    }),
  },
  notification: {
    admin: r.one.admin({
      from: r.notification.actorAdminId,
      to: r.admin.id,
      alias: "notification_actorAdminId_admin_id",
    }),
    user: r.one.user({
      from: r.notification.actorUserId,
      to: r.user.id,
    }),
    company: r.one.company({
      from: r.notification.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.notification.hostelId,
      to: r.hostel.id,
    }),
    admins: r.many.admin({
      alias: "admin_id_notification_id_via_notificationRead",
    }),
    reads: r.many.notificationRead(),
  },
  notificationRead: {
    notification: r.one.notification({
      from: r.notificationRead.notificationId,
      to: r.notification.id,
    }),
    admin: r.one.admin({
      from: r.notificationRead.adminId,
      to: r.admin.id,
    }),
  },
  payment: {
    billing: r.one.billing({
      from: r.payment.billingId,
      to: r.billing.id,
    }),
    company: r.one.company({
      from: r.payment.companyId,
      to: r.company.id,
    }),
    student: r.one.student({
      from: r.payment.studentId,
      to: r.student.id,
    }),
  },
  visitor: {
    admin: r.one.admin({
      from: r.visitor.adminId,
      to: r.admin.id,
    }),
    company: r.one.company({
      from: r.visitor.companyId,
      to: r.company.id,
    }),
    hostel: r.one.hostel({
      from: r.visitor.hostelId,
      to: r.hostel.id,
    }),
    student: r.one.student({
      from: r.visitor.studentId,
      to: r.student.id,
    }),
    visitorLogs: r.many.visitorLogs(),
  },
  visitorLogs: {
    admin: r.one.admin({
      from: r.visitorLogs.adminId,
      to: r.admin.id,
    }),
    company: r.one.company({
      from: r.visitorLogs.companyId,
      to: r.company.id,
    }),
    visitor: r.one.visitor({
      from: r.visitorLogs.visitorId,
      to: r.visitor.id,
    }),
  },

  reportTemplate: {
    company: r.one.company({
      from: r.reportTemplate.companyId,
      to: r.company.id,
    }),
    createdBy: r.one.user({
      from: r.reportTemplate.userId,
      to: r.user.id,
      alias: "reportTemplate_userId_user_id",
    }),
  },
}));
