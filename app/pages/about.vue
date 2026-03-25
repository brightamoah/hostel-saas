<script setup lang="ts">
import { useRoleBasedRoute } from "~/composables/useRoleBasedRoutes";
// import { sampleVisitor } from "~/lib/dummy";

const roleRoutes = useRoleBasedRoute();

const stats: StatsCard[] = [
  { id: 1, title: "Total Students", icon: "i-lucide-users", color: "primary", value: "1,284", percentage: 12, period: "monthly" },
  { id: 2, title: "Occupied Rooms", icon: "i-lucide-bed", color: "success", value: "342", percentage: 4, period: "weekly" },
  { id: 3, title: "Pending Payments", icon: "i-lucide-credit-card", color: "warning", value: "28", percentage: -3, period: "monthly", to: { name: "admin-billing" } },
  { id: 4, title: "Maintenance Jobs", icon: "i-lucide-wrench", color: "error", value: "9", percentage: -18, period: "monthly" },

];
</script>

<template>
  <div>
    <ULink
      :to="roleRoutes?.profile"
      label="Go to home"
    >
      {{ roleRoutes?.profile.name }}
    </ULink>

    <BillingConfirmation />

    <DashboardStats :cards="stats" />

    <DashboardStatsCard :cards="stats" />

    <div
      class="gap-3 grid"
      :class="[
        stats.length === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
      ]"
    >
      <DashboardNewCard
        v-for="card in stats"
        :key="card.id"
        :card="card"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
