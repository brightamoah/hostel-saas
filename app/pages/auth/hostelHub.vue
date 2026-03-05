<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth"],
  layout: "onboard",
});
</script>

<template>
  <div>
    <UCard>
      <h2 class="mb-4 font-semibold text-2xl">
        Welcome to HostelHub!
      </h2>

      <p class="mb-6 text-muted">
        Your student dashboard is coming soon. In the meantime, you can explore our features and learn how HostelHub can transform your hostel management experience.
      </p>

      <UButton
        color="primary"
        :to="{ name: 'index' }"
        target="_blank"
      >
        Explore Features
      </UButton>
    </UCard>
  </div>
</template>

<style scoped>

</style>
