<script setup lang="ts">
const { data } = defineProps<{
  data: SheetValidation;
}>();

const ERROR_CAP = 10;

const visibleErrors = computed(() => data.invalid.slice(0, ERROR_CAP));

const hiddenErrorCount = computed(() =>
  Math.max(0, data.invalid.length - ERROR_CAP),
);
</script>

<template>
  <div class="space-y-5 p-5">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-exclamation-circle"
          class="size-4 text-error shrink-0"
        />

        <span class="font-semibold text-error text-sm">Errors to fix</span>
      </div>

      <span class="text-muted text-xs">
        {{ data.invalid.length }} row{{ data.invalid.length !== 1 ? "s" : "" }} affected
      </span>
    </div>

    <div class="space-y-2">
      <div
        v-for="err in visibleErrors"
        :key="err.row"
        class="flex gap-3 bg-error/5 px-4 py-3 border border-error/15 rounded-lg"
      >
        <span class="pt-0.5 font-semibold tabular-nums text-error/80 text-xs shrink-0">
          Row {{ err.row }}
        </span>

        <ul class="space-y-1 min-w-0">
          <li
            v-for="(error, i) in err.errors"
            :key="i"
            class="text-default text-xs"
          >
            <span class="font-semibold text-error">{{ error.column }}:</span>
            {{ error.message }}
          </li>
        </ul>
      </div>

      <p
        v-if="hiddenErrorCount > 0"
        class="px-1 pt-1 text-muted text-xs italic"
      >
        … and {{ hiddenErrorCount }} more rows with errors
      </p>
    </div>
  </div>
</template>
