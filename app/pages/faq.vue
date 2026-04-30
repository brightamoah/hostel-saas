<script setup lang="ts">
import type { AccordionItem } from "@nuxt/ui";

const faqRef = useTemplateRef("faqRef");

useSchemaOrg([
  defineWebPage({
    "@type": "WebPage",
    "mainEntity": computed(() => {
      const items = faqRef.value?.faqItems as AccordionItem[] | undefined;

      if (!items || items.length === 0) return [];

      return items
        .filter(item => typeof item.label === "string" && typeof item.content === "string")
        .map(item => ({
          question: item.label,
          answer: item.content,
        }));
    }),
  }),
]);
</script>

<template>
  <div class="max-w-screen">
    <AppFaq ref="faqRef" />
  </div>
</template>

<style scoped></style>
