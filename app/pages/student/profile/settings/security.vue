<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth"],
  layout: {
    name: "student-dashboard",
    props: {
      sidebar: false,
    },
  },
});
</script>

<template>
  <div>
    <h1>security</h1>
  </div>
</template>

<style scoped>

</style>
