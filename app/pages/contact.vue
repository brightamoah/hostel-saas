<script setup lang="ts">
const title = "Contact";
const description = "Have questions about accommodation, payments, or maintenance? We're here to help.";
const image = "/images/hostel.jpg";
const url = "https://kayanest.app";

useHead({
  titleTemplate: title,
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    { name: "charset", content: "utf-8" },
    { name: "color-scheme", content: "light dark" },
  ],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
    { rel: "canonical", href: url },
  ],
});

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: image,
  ogUrl: url,
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
});
</script>

<template>
  <UPageSection
    title="Get In Touch With Us"
    description="Have questions about accommodation, payments, or maintenance? We're here to help."
    :ui="{
      title: 'font-newsreader animate-fade-in-up capitalize italics',
      description: '-mt-0.5',
    }"
  >
    <UCard class="mx-auto md:-mt-10 w-full max-w-160">
      <ContactForm />
    </UCard>
  </UPageSection>
</template>

<style scoped></style>
