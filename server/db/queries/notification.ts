import type { AdminScope, NotificationDTO } from "~~/shared/types";
import type { H3Event } from "h3";

import { sql } from "drizzle-orm";

export async function notificationQueries(event?: H3Event) {
  const { db } = useDB(event);

  const getNotifications = async (scope: AdminScope, limit = 10): Promise<NotificationDTO[]> => {
    const mode = getScopeMode(scope);

    if (mode === "company" && !scope.companyId) return [];
    if (mode === "hostel" && !scope.adminData.hostelId) return [];

    const applyNotificationScope = (scope: AdminScope, mode: string) => {
      if (mode === "none") return {};
      if (mode === "company") return { companyId: scope.companyId! };
      if (mode === "hostel") return { hostelId: scope.adminData.hostelId! };
      return { RAW: () => sql`FALSE` };
    };

    const baseFilter = {
      status: "pending" as const,
      ...applyNotificationScope(scope, mode),
    };

    const [pendingMaintenance, pendingComplaints, pendingVisitors] = await Promise.all([
      db.query.maintenanceRequest.findMany({
        where: baseFilter,
        with: {
          room: true,
          student: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        limit,
      }),

      db.query.complaint.findMany({
        where: baseFilter,
        with: {
          student: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        limit,
      }),

      db.query.visitor.findMany({
        where: baseFilter,
        with: {
          student: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          hostel: true,
        },
        orderBy: { createdAt: "desc" },
        limit,
      }),
    ]);

    const notifications: NotificationDTO[] = [
      ...pendingMaintenance.map(m => ({
        id: `maintenance-${m.id}`,
        title: "New Maintenance Request",
        message: m.room ? `Room ${m.room.roomNumber}: ${m.description}` : m.description,
        type: "maintenance" as const,
        sender: m.student!.user!,
        isRead: false,
        link: { name: "admin-maintenance", query: { id: m.id } },
        createdAt: m.createdAt,
      })),

      ...pendingComplaints.map(c => ({
        id: `complaint-${c.id}`,
        title: "New Complaint",
        message: c.description,
        type: "complaint" as const,
        sender: c.student!.user!,
        isRead: false,
        link: { name: "admin-complaints", query: { id: c.id } },
        createdAt: c.createdAt,
      })),

      ...pendingVisitors.map(v => ({
        id: `visitor-${v.id}`,
        title: "Visitor Pending Approval",
        message: `${v.name} is visiting ${v?.student?.user?.name}${v.hostel ? ` (${v.hostel.name})` : ""}`,
        type: "visitor" as const,
        sender: v.student!.user!,
        isRead: false,
        link: { name: "admin-visitors", query: { id: v.id } },
        createdAt: v.createdAt,
      })),
    ];

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  return { getNotifications };
}
