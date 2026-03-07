<script setup lang="ts">
definePageMeta({
  layout: "onboard",
});

const route = useRoute("hostels-hostelSlug");
</script>

<template>
  <UContainer class="py-10">
    <div>
      <h1>{{ route.params.hostelSlug }}</h1>
    </div>
  </UContainer>
</template>

<style scoped>

</style>
