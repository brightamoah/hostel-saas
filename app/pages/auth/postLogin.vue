<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: ["auth-redirect"],
});
</script>

<template>
  <div>
    <h1>postLogin</h1>

    <NuxtLink
      to="/"
      class="text-primary"
    >
      Go Home
    </NuxtLink>
  </div>
</template>

<style scoped>

</style>
