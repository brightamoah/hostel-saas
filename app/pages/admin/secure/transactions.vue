<script lang="ts" setup>
definePageMeta({
  middleware: ["requires-auth", "platform-or-owner"],
});
</script>

<template>
  <div>
    <h1>Transactions</h1>
  </div>
</template>

<style scoped>

</style>
