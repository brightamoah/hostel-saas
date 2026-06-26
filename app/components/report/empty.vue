<script lang="ts" setup>

</script>

<template>
  <div class="flex flex-col flex-1 justify-center items-center p-12 text-center select-none">
    <UIcon
      name="i-lucide-table-2"
      class="mb-2 size-16 text-muted"
    />

    <h3 class="mb-1 font-newsreader font-semibold text-highlighted text-xl">
      No preview data yet
    </h3>

    <p class="max-w-85 text-muted">
      Choose a template or configure a custom report on the left,
      then click <span class="font-medium text-toned">Generate Preview</span>.
    </p>

    <!-- Mini hint steps -->
    <div class="flex flex-col gap-2 mt-3 max-w-60 text-left">
      <div
        v-for="(step, i) in [
          'Select a template or module',
          'Choose columns & filters',
          'Click Generate Preview',
        ]"
        :key="i"
        class="flex items-center gap-2.5"
      >
        <span class="flex justify-center items-center bg-primary/10 rounded-full size-6 font-bold text-primary text-base shrink-0">
          {{ i + 1 }}
        </span>

        <span class="text-muted text-base">{{ step }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
