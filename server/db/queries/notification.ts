import type { AdminScope, NotificationDTO } from "~~/shared/types";

function getScopeMode(scope: AdminScope) {
  if (scope.isPlatformAdmin) return "none" as const;
  if (scope.companyRole === "owner") return "company" as const;
  return "hostel" as const;
}

export async function notificationQueries() {
  const { db } = useDB();

  const getNotifications = async (scope: AdminScope, limit = 10): Promise<NotificationDTO[]> => {
    const mode = getScopeMode(scope);

    if (mode === "company" && !scope.companyId) return [];
    if (mode === "hostel" && !scope.adminData.hostelId) return [];

    const maintenanceWhere = (table: any, { eq, and }: any) => and(
      eq(table.status, "pending"),
      mode === "none"
        ? undefined
        : mode === "company"
          ? eq(table.companyId, scope.companyId!)
          : eq(table.hostelId, scope.adminData.hostelId!),
    );

    const complaintWhere = (table: any, { eq, and }: any) => and(
      eq(table.status, "pending"),
      mode === "none"
        ? undefined
        : mode === "company"
          ? eq(table.companyId, scope.companyId!)
          : eq(table.hostelId, scope.adminData.hostelId!),
    );

    const visitorWhere = (table: any, { eq, and }: any) => and(
      eq(table.status, "pending"),
      mode === "none"
        ? undefined
        : mode === "company"
          ? eq(table.companyId, scope.companyId!)
          : eq(table.hostelId, scope.adminData.hostelId!),
    );

    const [pendingMaintenance, pendingComplaints, pendingVisitors] = await Promise.all([
      db.query.maintenanceRequest.findMany({
        where: maintenanceWhere,
        with: {
          room: true,
          student: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
      }),

      db.query.complaint.findMany({
        where: complaintWhere,
        with: {
          student: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
      }),

      db.query.visitor.findMany({
        where: visitorWhere,
        with: {
          student: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
          hostel: true,
        },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit,
      }),
    ]);

    const notifications: NotificationDTO[] = [
      ...pendingMaintenance.map(m => ({
        id: `maintenance-${m.id}`,
        title: "New Maintenance Request",
        message: m.room ? `Room ${m.room.roomNumber}: ${m.description}` : m.description,
        type: "maintenance" as const,
        sender: m.student.user,
        isRead: false,
        link: { name: "admin-maintenance", query: { id: m.id } },
        createdAt: m.createdAt,
      })),

      ...pendingComplaints.map(c => ({
        id: `complaint-${c.id}`,
        title: "New Complaint",
        message: c.description,
        type: "complaint" as const,
        sender: c.student.user,
        isRead: false,
        link: { name: "admin-complaints", query: { id: c.id } },
        createdAt: c.createdAt,
      })),

      ...pendingVisitors.map(v => ({
        id: `visitor-${v.id}`,
        title: "Visitor Pending Approval",
        message: `${v.name} is visiting ${v.student.user.name}${v.hostel ? ` (${v.hostel.name})` : ""}`,
        type: "visitor" as const,
        sender: v.student.user,
        isRead: false,
        link: { name: "admin-visitors", query: { id: v.id } },
        createdAt: v.createdAt,
      })),
    ];

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  return { getNotifications };
}
