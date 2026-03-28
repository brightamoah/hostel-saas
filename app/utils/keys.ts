import type { CookieRef } from "#app";

type IsMobileContext = ComputedRef<boolean>;
type DashboardContext = {
  roommates: ComputedRef<Roommate[]>;
  room: ComputedRef<StudentRoom | null>;
  visitors: ComputedRef<StudentVisitor[]>;
};

type RefreshContext = {
  handleRefresh: () => Promise<boolean>;
  canResend: ComputedRef<boolean>;
  coolDownTime: CookieRef<number>;
  refreshIsLoading: Ref<boolean>;
};

export const dashboardKey = Symbol("dashboard") as InjectionKey<DashboardContext>;

export const roomsInHostelKey = Symbol("roomsInHostel") as InjectionKey<ComputedRef<RoomInHostel[]>>;

export const refreshKey = Symbol("refreshContext") as InjectionKey<RefreshContext>;

export const isMobileKey = Symbol("isMobile") as InjectionKey<IsMobileContext>;
export const userProfileKey = Symbol("userProfile") as InjectionKey<ComputedRef<UserProfile | null>>;
