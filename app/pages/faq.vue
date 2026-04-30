<script setup lang="ts">
const faq = useTemplateRef("faq");

interface FAQSchema {
  "@context": string;
  "@type": string;
  "mainEntity": Array<{
    "@type": string;
    "name": string;
    "acceptedAnswer": {
      "@type": string;
      "text": string;
    };
  }>;
}

const faqSchema = ref<FAQSchema>({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [],
});

watchEffect(() => {
  if (faq.value?.faqItems) {
    faqSchema.value = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq.value.faqItems.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer,
        },
      })),
    };
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
    <AppFaq ref="faq" />
  </div>
</template>

<style scoped></style>
