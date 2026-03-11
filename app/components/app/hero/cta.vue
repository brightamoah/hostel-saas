<script setup lang="ts">
const footerItems = [
  {
    icon: "i-lucide-lock",
    text: "Secure & private",
  },
  {
    icon: "i-lucide-zap",
    text: "Set up in minutes",
  },
  {
    icon: "i-lucide-headphones",
    text: "Support always available",
  },
];
</script>

<template>
  <UPageCTA
    description="Join us today and experience the future of hostel management with Kayanest!"
    variant="subtle"
    class="bg-default shadow-md"
    :ui="{
      container: 'sm:py-10 lg:py-10 sm:gap-8',
    }"
  >
    <template #title>
      <UBadge
        color="primary"
        variant="subtle"
        size="lg"
        label="Get Started"
        class="mb-4 rounded-full"
      />

      <h2 class="mb-4 font-newsreader font-bold text-highlighted text-4xl lg:text-5xl tracking-tight">
        One platform,<br>

        <span class="text-primary">two powerful experiences</span>
      </h2>
    </template>

    <template #description>
      <p class="mx-auto max-w-xl font-bold text-highlighted text-lg">
        Have A Hostel You Want To Manage?
      </p>

      <p class="mx-auto mt-2 text-muted text-lg">
        Join us today and experience the future of hostel management with Kayanest!
      </p>
    </template>

    <template #footer>
      <div class="flex flex-wrap justify-center gap-3">
        <UButton
          :to="{ name: 'auth-login' }"
          size="lg"
          color="primary"
          variant="solid"
          label="Go to Dashboard"
          trailing-icon="i-lucide-arrow-right"
          class="cursor-pointer"
        />

        <UButton
          :to="{ name: 'auth-registerCompany' }"
          size="lg"
          color="neutral"
          variant="subtle"
          icon="i-lucide-building-2"
          label="Register your hostel"
          class="cursor-pointer"
        />
      </div>

      <div class="flex flex-wrap justify-center items-center gap-x-8 mt-12">
        <div
          v-for="item in footerItems"
          :key="item.text"
          class="flex items-center gap-2 text-dimmed text-sm"
        >
          <UIcon
            :name="item.icon"
            class="size-4 text-primary"
          />

          <span>{{ item.text }}</span>
        </div>
      </div>
    </template>
  </UPageCTA>
</template>

<style scoped>

</style>
