<script setup lang="ts">
const props = defineProps<{ card: StatsCard }>();

const isPositive = computed(() => (props.card.percentage ?? 0) >= 0);

const trendIcon = computed(() =>
  isPositive.value ? "i-lucide-trending-up" : "i-lucide-trending-down",
);

const trendColor = computed(() =>
  isPositive.value ? "text-success" : "text-error",
);

const percentageDisplay = computed(() => {
  const p = props.card.percentage;
  if (p === undefined) return null;
  return `${p > 0 ? "+" : ""}${p}%`;
});
</script>

<template>
  <component
    :is="card.to ? resolveComponent('ULink') : 'div'"
    :to="card.to"
    class="group block"
  >
    <UCard
      class="h-full transition-all duration-200"
      :class="card.to && 'hover:ring-1 hover:ring-inset cursor-pointer'"
      :ui="{
        root: 'relative overflow-hidden',
        body: 'p-4 sm:p-5',
      }"
    >
      <div class="flex justify-between items-start gap-3">
        <div class="flex flex-col gap-2 min-w-0">
          <slot
            name="title"
            :card
          >
            <p class="font-geist font-medium text-muted text-xs sm:text-sm truncate">
              {{ card.title }}
            </p>
          </slot>

          <slot
            name="value"
            :card
          >
            <p class="font-newsreader font-semibold tabular-nums text-highlighted text-2xl leading-none tracking-tight">
              {{ card.value }}
            </p>
          </slot>

          <slot
            name="description"
            :card
            :percentage-display
            :trend-icon
            :trend-color
          >
            <div
              v-if="percentageDisplay || card.period"
              class="flex flex-wrap items-center gap-1.5"
            >
              <span
                v-if="percentageDisplay !== null"
                class="flex items-center gap-0.5 font-medium text-sm"
                :class="trendColor"
              >
                <UIcon
                  :name="trendIcon"
                  class="size-4 shrink-0"
                />
                {{ percentageDisplay }}
              </span>

              <span
                v-if="card.period"
                class="text-dimmed text-xs"
              >
                {{ card.period }}
              </span>
            </div>
          </slot>
        </div>

        <slot
          name="icon"
          :card
        >
          <UBadge
            :color="card.color"
            variant="subtle"
            class="p-2 rounded-lg shrink-0"
            :ui="{ base: 'gap-0' }"
          >
            <UIcon
              :name="card.icon"
              class="size-5"
            />
          </UBadge>
        </slot>
      </div>

      <slot
        name="footer"
        :card
      />

      <slot
        name="accent"
        :card
      >
        <div
          class="right-0 bottom-0 left-0 absolute opacity-40 h-0.5 group-hover:h-1"
          :class="`bg-${card.color}`"
        />
      </slot>
    </UCard>
  </component>
</template>
