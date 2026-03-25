<script setup lang="ts">
defineProps<{ cards: StatsCard[] }>();

type SlotName = "title" | "value" | "description" | "icon" | "footer" | "accent";

const slots = defineSlots<{
  title: (props: { card: StatsCard }) => void;
  value: (props: { card: StatsCard }) => void;
  description: (props: { card: StatsCard }) => void;
  icon: (props: { card: StatsCard }) => void;
  footer: (props: { card: StatsCard }) => void;
  accent: (props: { card: StatsCard }) => void;
}>();

const slotNames = Object.keys(slots) as SlotName[];
</script>

<template>
  <div
    class="gap-3 grid"
    :class="[
      cards.length === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    ]"
  >
    <DashboardNewCard
      v-for="card in cards"
      :key="card.id"
      :card="card"
    >
      <template
        v-for="name in slotNames"
        #[name]="slotProps"
      >
        <slot
          :name
          v-bind="slotProps ?? {}"
        />
      </template>
    </DashboardNewCard>
  </div>
</template>

<style scoped></style>
