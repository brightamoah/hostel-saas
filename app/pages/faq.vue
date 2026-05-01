<script setup lang="ts">
import { faqItems } from "~/data/faq";

definePageMeta({
  layout: {
    name: "default",
    props: {
      title: "Frequently Asked Questions",
      showBg: false,
    },
  },
});

useSchemaOrg([
  defineWebPage({
    mainEntity: faqItems.map(item => ({
      "@type": "Question",
      "name": item.label,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.content,
      },
    })),
  }),
]);
</script>

<template>
  <div class="max-w-screen">
    <AppFaq :faq-items />
  </div>
</template>

<style scoped></style>
