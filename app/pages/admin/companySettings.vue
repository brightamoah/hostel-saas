<script setup lang="ts">
definePageMeta({
  layout: {
    name: "settings",
    props: {
      title: "Company Settings",
    },
  },
  middleware: ["requires-auth", "admin", "platform-or-owner"],
});
</script>

<template>
  <div>
    <UButton
      label="Back to Profile"
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      :to="{ name: 'admin-profile' }"
      class="mb-6"
    />

    <h1>companySettings</h1>
  </div>
</template>

<style scoped>

</style>
