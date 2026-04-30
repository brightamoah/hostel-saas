<script setup lang="ts">
import type { AccordionItem } from "@nuxt/ui";

const { faqItems } = defineProps<{
  faqItems: AccordionItem[];
}>();
</script>

<template>
  <UPageSection
    title="Frequently Asked Questions"
    description="Browse through these FAQs to find answers to commonly asked questions about our hostel management system."
    :ui="{
      title: 'font-newsreader animate-fade-in-up capitalize italics',
      description: 'animate-fade-in-up animation-delay-600 -mt-0.5',
    }"
  >
    <template #headline>
      <div class="text-center animate-fade-in-up animation-delay-1600">
        <UBadge
          variant="subtle"
          class="justify-center items-center rounded-full"
        >
          FAQs
        </UBadge>
      </div>
    </template>

    <UAccordion
      multiple
      class="mx-auto md:-mt-10 max-w-4xl"
      trailing-icon="i-lucide-plus"
      :items="faqItems"
      :ui="{
        item: 'mb-2 group px-4 transform-gpu rounded-xl border-2 transition duration-500 will-change-transform bg-muted/20 ',
        trailingIcon:
          'group-data-[state=closed]:rotate-0 group-data-[state=open]:rotate-135',
      }"
    />
  </UPageSection>
</template>

<style scoped></style>
