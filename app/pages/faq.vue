<script setup lang="ts">
import type { AccordionItem } from "@nuxt/ui";

const faqRef = useTemplateRef("faqRef");

useSchemaOrg([
  defineWebPage({
    "@type": "WebPage",
  }),
]);

const faqSchema = ref({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [] as Array<{
    "@type": "Question";
    "name": string;
    "acceptedAnswer": { "@type": "Answer"; "text": string };
  }>,
});

watchEffect(() => {
  const items = faqRef.value?.faqItems as AccordionItem[] | undefined;
  if (items && items.length) {
    const validItems = items.filter(
      (item): item is AccordionItem & { label: string; content: string } =>
        typeof item.label === "string" && typeof item.content === "string",
    );

    faqSchema.value.mainEntity = validItems.map(item => ({
      "@type": "Question",
      "name": item.label,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.content,
      },
    }));
  }
});

useHead({
  script: [
    {
      type: "application/ld+json",
      innerHTML: computed(() => JSON.stringify(faqSchema.value)),
    },
  ],
});
</script>

<template>
  <div class="max-w-screen">
    <AppFaq ref="faqRef" />
  </div>
</template>

<style scoped></style>
