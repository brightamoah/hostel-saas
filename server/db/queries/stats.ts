import type { H3Event } from "h3";
import type { CardStatsScope, OverviewAdminScope } from "~~/shared/types";

import { and, count, eq, gte, sql } from "drizzle-orm";

import {
  allocation,
  billing,
  complaint,
  maintenanceRequest,
  payment,
  room,
  student,
  visitor,
} from "../schema";

export async function statsQueries(event?: H3Event) {
  const { db } = useDB(event);

  const getCardStats = async (scope: CardStatsScope) => {
    const scopeMode = scope.isPlatformAdmin
      ? "none"
      : scope.companyRole === "owner"
        ? "company"
        : "hostel";

    if (scopeMode === "company" && !scope.companyId) {
      throw createError({
        statusCode: 400,
        message: "Missing companyId for company-scoped card stats.",
      });
    }

    if (scopeMode === "hostel" && !scope.hostelId) {
      throw createError({
        statusCode: 400,
        message: "Missing hostelId for hostel-scoped card stats.",
      });
    }

    const roomCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(room.companyId, scope.companyId!)
        : eq(room.hostelId, scope.hostelId!);

    const billingCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(billing.companyId, scope.companyId!)
        : eq(billing.hostelId, scope.hostelId!);

    // 1. Revenue (Current Month vs Last Month)
    const [revenue] = await db.select({
      currentMonth: sql<number>`COALESCE(SUM(CASE WHEN DATE_TRUNC('month', ${payment.paymentDate}) = DATE_TRUNC('month', CURRENT_DATE) THEN ${payment.amount} ELSE 0 END), 0)::float`,
      lastMonth: sql<number>`COALESCE(SUM(CASE WHEN DATE_TRUNC('month', ${payment.paymentDate}) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN ${payment.amount} ELSE 0 END), 0)::float`,
    })
      .from(payment)
      .leftJoin(billing, eq(payment.billingId, billing.id))
      .where(and(eq(payment.status, "completed"), billingCondition));

    // 2. Capacity & Rooms (Current State)
    const [capacity] = await db.select({
      totalCapacity: sql<number>`COALESCE(SUM(${room.capacity}), 0)::int`,
      currentOccupied: sql<number>`COALESCE(SUM(${room.currentOccupancy}), 0)::int`,
    })
      .from(room)
      .where(roomCondition);

    // 3. Allocations (Historical Residents for last month's comparison)
    const prevMonthDate = sql`CURRENT_DATE - INTERVAL '1 month'`;
    const [allocations] = await db.select({
      lastMonthActive: sql<number>`COALESCE(SUM(CASE WHEN ${allocation.allocationDate} <= ${prevMonthDate} AND (${allocation.endDate} IS NULL OR ${allocation.endDate} >= ${prevMonthDate}) THEN 1 ELSE 0 END), 0)::int`,
    })
      .from(allocation)
      .leftJoin(room, eq(allocation.roomId, room.id))
      .where(roomCondition);

    // Helper to calculate percentage safely
    const calcPercent = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    const currentResidents = capacity?.currentOccupied || 0;
    const previousResidents = allocations?.lastMonthActive || 0;

    const currentAvailable = (capacity?.totalCapacity || 0) - currentResidents;
    const previousAvailable = (capacity?.totalCapacity || 0) - previousResidents;

    const currentOccupancyRate = capacity?.totalCapacity
      ? (currentResidents / capacity.totalCapacity) * 100
      : 0;

    const previousOccupancyRate = capacity?.totalCapacity
      ? (previousResidents / capacity.totalCapacity) * 100
      : 0;

    return {
      totalResidents: {
        value: currentResidents,
        percentage: calcPercent((currentResidents || 0), (previousResidents || 0)),
      },
      occupancyRate: {
        value: Number(currentOccupancyRate.toFixed(1)),
        percentage: calcPercent(currentOccupancyRate, previousOccupancyRate),
        totalCapacity: capacity?.totalCapacity || 0,
        totalOccupied: capacity?.currentOccupied || 0,
      },
      availableBeds: {
        value: currentAvailable,
        percentage: calcPercent(currentAvailable, previousAvailable),
        totalCapacity: capacity?.totalCapacity || 0,
      },
      monthlyRevenue: {
        value: revenue?.currentMonth,
        percentage: calcPercent((revenue?.currentMonth || 0), (revenue?.lastMonth || 0)),
      },
    };
  };

  const getDashboardOverview = async (admin: OverviewAdminScope) => {
    const scopeMode = admin.isPlatformAdmin
      ? "none"
      : admin.companyRole === "owner"
        ? "company"
        : "hostel";

    if (scopeMode === "company" && !admin.companyId) {
      throw createError({
        statusCode: 400,
        message: "Missing companyId for company-scoped overview stats.",
      });
    }

    if (scopeMode === "hostel" && !admin.hostelId) {
      throw createError({
        statusCode: 400,
        message: "Missing hostelId for hostel-scoped overview stats.",
      });
    }

    const roomCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(room.companyId, admin.companyId!)
        : eq(room.hostelId, admin.hostelId!);

    const billingCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(billing.companyId, admin.companyId!)
        : eq(billing.hostelId, admin.hostelId!);

    const complaintCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(complaint.companyId, admin.companyId!)
        : eq(complaint.hostelId, admin.hostelId!);

    const maintenanceCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(maintenanceRequest.companyId, admin.companyId!)
        : eq(maintenanceRequest.hostelId, admin.hostelId!);

    const visitorCondition = scopeMode === "none"
      ? undefined
      : scopeMode === "company"
        ? eq(visitor.companyId, admin.companyId!)
        : eq(visitor.hostelId, admin.hostelId!);

    // Occupancy Stats
    const occupancyQuery = db.select({
      totalRooms: sql<number>`COUNT(*)::int`,
      occupiedRooms: sql<number>`SUM(CASE WHEN ${room.currentOccupancy} > 0 THEN 1 ELSE 0 END)::int`,
      vacantRooms: sql<number>`SUM(CASE WHEN ${room.status} = 'vacant' THEN 1 ELSE 0 END)::int`,
      maintenanceRooms: sql<number>`SUM(CASE WHEN ${room.status} = 'under maintenance' THEN 1 ELSE 0 END)::int`,
      totalCapacity: sql<number>`COALESCE(SUM(${room.capacity}), 0)::int`,
      currentOccupancy: sql<number>`COALESCE(SUM(${room.currentOccupancy}), 0)::int`,
    })
      .from(room)
      .where(roomCondition);

    // Student Demographics
    const studentQuery = scopeMode === "none"
      ? db.select({
          total: count(student.id),
          active: count(sql`CASE WHEN ${student.residencyStatus} = 'active' THEN 1 END`),
          males: count(sql`CASE WHEN ${student.gender} = 'male' AND ${student.residencyStatus} = 'active' THEN 1 END`),
          females: count(sql`CASE WHEN ${student.gender} = 'female' AND ${student.residencyStatus} = 'active' THEN 1 END`),
        }).from(student)
      : scopeMode === "company"
        ? db.select({
            total: count(student.id),
            active: count(sql`CASE WHEN ${student.residencyStatus} = 'active' THEN 1 END`),
            males: count(sql`CASE WHEN ${student.gender} = 'male' AND ${student.residencyStatus} = 'active' THEN 1 END`),
            females: count(sql`CASE WHEN ${student.gender} = 'female' AND ${student.residencyStatus} = 'active' THEN 1 END`),
          })
            .from(student)
            .where(eq(student.companyId, admin.companyId!))
        : db.select({
            total: count(student.id),
            active: count(sql`CASE WHEN ${student.residencyStatus} = 'active' THEN 1 END`),
            males: count(sql`CASE WHEN ${student.gender} = 'male' AND ${student.residencyStatus} = 'active' THEN 1 END`),
            females: count(sql`CASE WHEN ${student.gender} = 'female' AND ${student.residencyStatus} = 'active' THEN 1 END`),
          })
            .from(student)
            .innerJoin(allocation, eq(student.id, allocation.studentId))
            .innerJoin(room, eq(allocation.roomId, room.id))
            .where(and(eq(room.hostelId, admin.hostelId!), eq(allocation.status, "active")));

    const financialQuery = db.select({
      totalRevenue: sql<number>`COALESCE(SUM(${payment.amount}), 0)::float`,
    })
      .from(payment)
      .leftJoin(billing, eq(payment.billingId, billing.id))
      .where(and(eq(payment.status, "completed"), billingCondition));

    const outstandingQuery = db.select({
      totalExpected: sql<number>`COALESCE(SUM(${billing.amount}), 0)::float`,
      totalCollected: sql<number>`COALESCE(SUM(${billing.paidAmount}), 0)::float`,
      totalOutstanding: sql<number>`COALESCE(SUM(${billing.amount} - ${billing.paidAmount}), 0)::float`,
      overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${billing.status} = 'overdue' THEN (${billing.amount} - ${billing.paidAmount} + COALESCE(${billing.lateFee}, 0)) ELSE 0 END), 0)::float`,
    })
      .from(billing)
      .where(billingCondition);

    const complaintsQuery = db.select({
      pending: sql<number>`SUM(CASE WHEN ${complaint.status} = 'pending' THEN 1 ELSE 0 END)::int`,
      inProgress: sql<number>`SUM(CASE WHEN ${complaint.status} = 'in-progress' THEN 1 ELSE 0 END)::int`,
      critical: sql<number>`SUM(CASE WHEN ${complaint.priority} = 'emergency' AND ${complaint.status} != 'resolved' THEN 1 ELSE 0 END)::int`,
    })
      .from(complaint)
      .where(complaintCondition);

    const maintenanceQuery = db.select({
      pending: sql<number>`SUM(CASE WHEN ${maintenanceRequest.status} = 'pending' THEN 1 ELSE 0 END)::int`,
      inProgress: sql<number>`SUM(CASE WHEN ${maintenanceRequest.status} = 'in-progress' THEN 1 ELSE 0 END)::int`,
      critical: sql<number>`SUM(CASE WHEN ${maintenanceRequest.priority} = 'emergency' AND ${maintenanceRequest.status} != 'completed' THEN 1 ELSE 0 END)::int`,
    })
      .from(maintenanceRequest)
      .where(maintenanceCondition);

    const visitorsQuery = db.select({
      active: sql<number>`SUM(CASE WHEN ${visitor.status} = 'checked-in' THEN 1 ELSE 0 END)::int`,
      pending: sql<number>`SUM(CASE WHEN ${visitor.status} = 'pending' THEN 1 ELSE 0 END)::int`,
    })
      .from(visitor)
      .where(visitorCondition);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const revenueTrendQuery = db.select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${payment.paymentDate}), 'YYYY-MM')`,
      amount: sql<number>`COALESCE(SUM(${payment.amount}), 0)::float`,
    })
      .from(payment)
      .leftJoin(billing, eq(payment.billingId, billing.id))
      .where(and(
        eq(payment.status, "completed"),
        gte(payment.paymentDate, twelveMonthsAgo),
        billingCondition,
      ))
      .groupBy(sql`DATE_TRUNC('month', ${payment.paymentDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${payment.paymentDate})`);

    const [
      [occupancyData],
      [studentData],
      [financialData],
      [outstandingData],
      [complaintsData],
      [maintenanceData],
      [visitorsData],
      revenueTrend,
    ] = await Promise.all([
      occupancyQuery,
      studentQuery,
      financialQuery,
      outstandingQuery,
      complaintsQuery,
      maintenanceQuery,
      visitorsQuery,
      revenueTrendQuery,
    ]);

    const filledRevenueTrend = Array.from({ length: 12 }).map((_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - index));

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      // Match with the database result, or default to 0
      const found = (revenueTrend || []).find(t => t.month === monthKey);

      return {
        month: monthKey,
        amount: found ? Number(found.amount) : 0,
      };
    });

    return {
      occupancy: {
        ...occupancyData,
        rate: occupancyData?.totalCapacity ? (Number(occupancyData.currentOccupancy) / Number(occupancyData.totalCapacity)) * 100 : 0,
      },
      students: {
        total: Number(studentData?.total || 0),
        active: Number(studentData?.active || 0),
        males: Number(studentData?.males || 0),
        females: Number(studentData?.females || 0),
      },
      finance: {
        totalRevenue: Number(financialData?.totalRevenue || 0),
        totalExpected: Number(outstandingData?.totalExpected || 0),
        totalCollected: Number(outstandingData?.totalCollected || 0),
        totalOutstanding: Number(outstandingData?.totalOutstanding || 0),
        overdueAmount: Number(outstandingData?.overdueAmount || 0),
      },
      tasks: {
        pendingComplaints: Number(complaintsData?.pending || 0),
        inProgressComplaints: Number(complaintsData?.inProgress || 0),
        criticalComplaints: Number(complaintsData?.critical || 0),
        pendingMaintenance: Number(maintenanceData?.pending || 0),
        inProgressMaintenance: Number(maintenanceData?.inProgress || 0),
        criticalMaintenance: Number(maintenanceData?.critical || 0),
      },
      visitors: {
        active: Number(visitorsData?.active || 0),
        pending: Number(visitorsData?.pending || 0),
      },
      revenueTrend: filledRevenueTrend,
    };
  };

  return {
    getCardStats,
    getDashboardOverview,
  };
}
