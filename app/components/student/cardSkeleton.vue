<script setup lang="ts">
const cards = [
  {
    id: "room",
    class: "",
  },
  {
    id: "visitors",
    class: "lg:col-span-2",
  },
  {
    id: "requests",
    class: "lg:col-span-2",
  },
  {
    id: "billing",
    class: "",
  },
];
</script>

<template>
  <div class="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-4">
    <UCard
      v-for="card in cards"
      :key="card.id"
      :class="card.class"
      class="border-2 border-muted"
      :ui="{
        header: 'border-b-0 p-4 px-4',
      }"
    >
      <template #header>
        <div class="justify-between grid grid-cols-2">
          <div class="flex items-center gap-2">
            <USkeleton class="rounded-full size-5" />

            <USkeleton class="rounded w-32 h-5" />
          </div>

          <USkeleton class="justify-self-end mt-2 rounded w-20 h-6" />
        </div>

        <USeparator
          class="justify-start mt-1.5 rounded-full w-35"
          size="lg"
          decorative
        />
      </template>

      <div class="space-y-4 py-2">
        <div class="flex items-center gap-3">
          <USkeleton class="rounded-full size-10 shrink-0" />

          <div class="flex-1 space-y-2">
            <USkeleton class="rounded w-3/4 h-4" />

            <USkeleton class="rounded w-1/2 h-3" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <USkeleton class="rounded-full size-10 shrink-0" />

          <div class="flex-1 space-y-2">
            <USkeleton class="rounded w-2/3 h-4" />

            <USkeleton class="rounded w-1/3 h-3" />
          </div>
        </div>
      </div>

      <template
        v-if="card.id === 'room'"
        #footer
      >
        <div class="gap-2 grid grid-cols-1 md:grid-cols-2">
          <USkeleton class="rounded w-full h-10" />

          <USkeleton class="rounded w-full h-10" />
        </div>
      </template>
    </UCard>
  </div>
</template>
