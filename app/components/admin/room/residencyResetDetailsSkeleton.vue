<script setup lang="ts">
type Type = "preview" | "details" | "history";

const {
  type = "details",
  count = 3,
} = defineProps<{
  type?: Type;
  count?: number;
}>();
</script>

<template>
  <div class="space-y-4">
    <template v-if="type === 'preview'">
      <div class="gap-3 grid grid-cols-2 sm:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="space-y-2 bg-elevated p-3 border border-muted rounded-lg text-center"
        >
          <USkeleton class="mx-auto rounded w-20 h-3" />

          <USkeleton class="mx-auto rounded w-12 h-6" />
        </div>
      </div>

      <div class="space-y-2 pt-2">
        <USkeleton class="rounded w-36 h-3" />

        <div class="space-y-2 p-2 border border-muted rounded-md divide-y divide-muted">
          <div
            v-for="i in count"
            :key="i"
            class="flex justify-between items-center py-1"
          >
            <div class="space-y-1 w-2/3">
              <USkeleton class="rounded w-3/4 h-3.5" />
            </div>

            <USkeleton class="rounded-full w-16 h-5" />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="border border-muted rounded-md divide-y divide-muted">
        <div
          v-for="i in count"
          :key="i"
          class="flex justify-between items-center p-3"
        >
          <div class="space-y-1.5 w-2/3">
            <USkeleton class="rounded w-1/2 h-4" />

            <USkeleton class="rounded w-1/3 h-3" />
          </div>

          <div class="flex items-center gap-2">
            <USkeleton class="rounded w-16 h-6" />

            <USkeleton class="rounded w-20 h-6" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
