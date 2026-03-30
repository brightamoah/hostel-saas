<script setup lang="ts">
definePageMeta({
  layout: {
    name: "settings",
    props: {
      title: "Change Password",
    },
  },
});

const { $handleFormError } = useNuxtApp();

const altAuthStore = useAltAuth();
const { changePasswordFields, isLoading } = storeToRefs(altAuthStore);
const { changePassword } = altAuthStore;
</script>

<template>
  <div>
    <UButton
      label="Go Back"
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      class="mb-6 cursor-pointer"
      @click="$router.back"
    />

    <UCard class="shadow-md mx-auto max-w-4xl">
      <h1 class="mb-4 font-semibold text-2xl">
        Change Password
      </h1>

      <UAlert
        variant="subtle"
        color="info"
        icon="i-lucide-info"
        class="flex items-center mb-6"
        description="
        Please ensure your new password is strong and unique. Avoid using easily guessable information such as common words, names, or dates. Your password should include a mix of uppercase and lowercase letters, numbers, and special characters."
      />

      <UAuthForm
        title="Change Password"
        description="Enter Your Current and New Password"
        class="mx-auto mb-5 max-w-md"
        icon="i-lucide-lock-keyhole-open"
        :fields="changePasswordFields"
        :schema="changePasswordSchema"
        :loading="isLoading"
        :submit="{
          label: isLoading ? '' : 'Change Password',
          icon: 'i-lucide-lock-keyhole-open',
          class: 'cursor-pointer',
          loading: isLoading,
          disabled: isLoading,
        }"
        @submit="changePassword($event)"
        @error="$handleFormError"
      />
    </UCard>
  </div>
</template>

<style scoped>

</style>
