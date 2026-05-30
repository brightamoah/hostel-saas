<!-- components/TimePickerInput.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  placeholder?: string;
  hourCycle?: 12 | 24;
  minuteStep?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  icon?: string;
}>(), {
  placeholder: "Select time",
  hourCycle: 24,
  minuteStep: 5,
  size: "md",
  icon: "i-lucide-clock",
});

const modelValue = defineModel<string | undefined>();
const open = ref(false);

const selectedHour = ref<number | undefined>();
const selectedMinute = ref<number | undefined>();
const period = ref<"AM" | "PM">("AM");

// Manual input state
const manualInput = ref("");
const manualError = ref("");

// Sync internal state when modelValue changes externally
watch(modelValue, (val) => {
  if (!val) {
    selectedHour.value = undefined;
    selectedMinute.value = undefined;
    manualInput.value = "";
    return;
  }
  const [hRaw, mRaw] = val.split(":").map(Number);
  const h = typeof hRaw === "number" && !Number.isNaN(hRaw) ? hRaw : 0;
  const m = typeof mRaw === "number" && !Number.isNaN(mRaw) ? mRaw : 0;
  selectedHour.value = props.hourCycle === 12 ? (h % 12 || 12) : h;
  selectedMinute.value = m;
  period.value = h >= 12 ? "PM" : "AM";
  manualInput.value = val;
}, { immediate: true });

const hours = computed(() => {
  const count = props.hourCycle === 12 ? 12 : 24;
  const start = props.hourCycle === 12 ? 1 : 0;
  return Array.from({ length: count }, (_, i) => start + i);
});

const minutes = computed(() =>
  Array.from({ length: Math.ceil(60 / props.minuteStep) }, (_, i) => i * props.minuteStep),
);

function commit() {
  if (selectedHour.value === undefined || selectedMinute.value === undefined) return;
  let h = selectedHour.value;
  if (props.hourCycle === 12) {
    if (period.value === "PM" && h !== 12) h += 12;
    if (period.value === "AM" && h === 12) h = 0;
  }
  const result = `${String(h).padStart(2, "0")}:${String(selectedMinute.value).padStart(2, "0")}`;
  modelValue.value = result;
  manualInput.value = result;
  manualError.value = "";
}

function selectHour(h: number) {
  selectedHour.value = h;
  commit();
}

function selectMinute(m: number) {
  selectedMinute.value = m;
  commit();
}

// Manual input handler
function onManualInput(val: string) {
  manualInput.value = val;
  manualError.value = "";

  // Auto-insert colon
  if (val.length === 2 && !val.includes(":")) {
    manualInput.value = `${val}:`;
    return;
  }

  const match = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return;

  const h = Number.parseInt(match[1]!);
  const m = Number.parseInt(match[2]!);
  const maxH = props.hourCycle === 12 ? 12 : 23;

  if (h < (props.hourCycle === 12 ? 1 : 0) || h > maxH || m < 0 || m > 59) {
    manualError.value = `Enter a valid time (${props.hourCycle === 12 ? "1–12" : "00–23"}:00–59)`;
    return;
  }

  selectedHour.value = h;
  // Snap minute to nearest step
  selectedMinute.value = minutes.value.reduce((a, b) =>
    Math.abs(b - m) < Math.abs(a - m) ? b : a,
  );
  period.value = (props.hourCycle === 24 && h >= 12) ? "PM" : period.value;
  commit();
}

const displayLabel = computed(() => {
  if (selectedHour.value === undefined || selectedMinute.value === undefined) return props.placeholder;
  const m = String(selectedMinute.value).padStart(2, "0");
  if (props.hourCycle === 12) {
    return `${selectedHour.value}:${m} ${period.value}`;
  }
  return `${String(selectedHour.value).padStart(2, "0")}:${m}`;
});

const hasValue = computed(() => !!modelValue.value);

// Auto-scroll selected items into view when popover opens
const hourListRef = useTemplateRef("hourList");
const minuteListRef = useTemplateRef("minuteList");

watch(open, async (val) => {
  if (!val) return;
  await nextTick();
  scrollToSelected(hourListRef.value, selectedHour.value);
  scrollToSelected(minuteListRef.value, selectedMinute.value);
});

function scrollToSelected(el: HTMLElement | null, value: number | undefined) {
  if (!el || value === undefined) return;
  const item = el.querySelector(`[data-value="${value}"]`) as HTMLElement | null;
  item?.scrollIntoView({ block: "center" });
}

function setNow() {
  const now = new Date();
  const rawH = now.getHours();
  selectedHour.value = props.hourCycle === 12 ? (rawH % 12 || 12) : rawH;
  selectedMinute.value = minutes.value.reduce((a, b) =>
    Math.abs(b - now.getMinutes()) < Math.abs(a - now.getMinutes()) ? b : a,
  );
  period.value = rawH >= 12 ? "PM" : "AM";
  commit();
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ side: 'bottom', align: 'start', sideOffset: 8 }"
    :ui="{ content: 'p-0 w-(--reka-popover-trigger-width) min-w-55' }"
  >
    <UButton
      :label="displayLabel"
      :icon="icon"
      color="neutral"
      variant="outline"
      :size="size"
      :disabled="disabled"
      class="justify-start w-full font-normal cursor-pointer"
      :class="!hasValue && 'text-muted'"
    >
      <template
        v-if="hasValue"
        #trailing
      >
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          class="-me-1 ml-auto cursor-pointer"
          @click.stop="modelValue = undefined; open = false"
        />
      </template>
    </UButton>

    <template #content>
      <!-- Manual input -->
      <div class="p-2 pb-0">
        <UInput
          :model-value="manualInput"
          placeholder="HH:MM"
          icon="i-lucide-pencil"
          size="lg"
          class="w-full"
          :trailing-icon="manualError ? 'i-lucide-circle-x' : (hasValue ? 'i-lucide-circle-check' : undefined)"
          :ui="{ trailingIcon: manualError ? 'text-error' : 'text-success' }"
          @update:model-value="onManualInput"
        />

        <p
          v-if="manualError"
          class="mt-1 px-1 text-error text-xs"
        >
          {{ manualError }}
        </p>
      </div>

      <USeparator class="mt-2" />

      <!-- Scroll columns -->
      <div class="flex items-stretch gap-1 p-2 pt-1">
        <!-- Hours -->
        <div class="flex-1">
          <p class="mb-1 text-muted text-xs text-center">
            Hr
          </p>

          <div
            ref="hourList"
            class="h-44 overflow-y-auto scroll-smooth scrollbar-hide"
          >
            <button
              v-for="h in hours"
              :key="h"
              :data-value="h"
              type="button"
              class="px-2 py-1.5 rounded-md w-full text-sm text-center transition-colors cursor-pointer"
              :class="selectedHour === h
                ? 'bg-primary text-white font-semibold'
                : 'text-default hover:bg-elevated'"
              @click="selectHour(h)"
            >
              {{ String(h).padStart(2, "0") }}
            </button>
          </div>
        </div>

        <div class="flex items-center pt-5 pb-1 font-bold text-muted text-sm shrink-0">
          :
        </div>

        <!-- Minutes -->
        <div class="flex-1">
          <p class="mb-1 text-muted text-xs text-center">
            Min
          </p>

          <div
            ref="minuteList"
            class="h-44 overflow-y-auto scroll-smooth scrollbar-hide"
          >
            <button
              v-for="m in minutes"
              :key="m"
              :data-value="m"
              type="button"
              class="px-2 py-1.5 rounded-md w-full text-sm text-center transition-colors cursor-pointer"
              :class="selectedMinute === m
                ? 'bg-primary text-white font-semibold'
                : 'text-default hover:bg-elevated'"
              @click="selectMinute(m)"
            >
              {{ String(m).padStart(2, '0') }}
            </button>
          </div>
        </div>

        <!-- AM/PM -->
        <template v-if="hourCycle === 12">
          <div class="bg-default mx-1 mt-6 w-px shrink-0" />

          <div class="flex flex-col justify-center gap-1 pt-5 shrink-0">
            <button
              v-for="p in ['AM', 'PM']"
              :key="p"
              type="button"
              class="px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer"
              :class="period === p
                ? 'bg-primary text-white font-semibold'
                : 'text-default hover:bg-elevated'"
              @click="period = p as 'AM' | 'PM'; commit()"
            >
              {{ p }}
            </button>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <USeparator />

      <div class="p-2">
        <UButton
          label="Now"
          icon="i-lucide-clock"
          color="neutral"
          variant="ghost"
          size="xs"
          block
          class="cursor-pointer"
          @click="setNow(); open = false"
        />
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.scrollbar-hide {
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
