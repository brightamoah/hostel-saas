<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { UpdatePhoneNumberSchema } from "~~/shared/utils/schema";

const userProfile = inject(userProfileKey);
const toast = useToast();

const { $handleFormError, $apiFetch } = useNuxtApp();

const state = ref({
  phoneNumber: "",
  password: "",
});
const isLoading = ref(false);
const showPassword = ref(false);
const form = useTemplateRef("formRef");

const profileKey = computed(() => `user-profile-${userProfile?.value?.id}`);

async function updatePhoneNumber(payload: FormSubmitEvent<UpdatePhoneNumberSchema>) {
  isLoading.value = true;

  try {
    if (userProfile?.value?.phoneNumber === payload.data.phoneNumber) {
      toast.add({
        title: "No Changes Detected",
        description: "The new phone number is the same as the current one.",
        color: "warning",
      });

      return;
    }

    const response = await $apiFetch("/api/user/updatePhoneNumber", {
      method: "PATCH",
      body: payload.data,
    });

    await refreshNuxtData(profileKey.value);

    toast.add({
      title: "Action Successful",
      description: response?.message || "Your phone number has been successfully updated.",
      color: "success",
    });
  }
  catch (error: any) {
    const message = error?.data?.message || "An error occurred while updating your phone number. Please try again.";
    toast.add({
      title: "Update Failed",
      description: message,
      color: "error",
    });
  }
  finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <UModal
    title="Change Phone Number"
    description="Update your phone number associated with your account."
    :ui="{
      footer: 'justify-end',
      content: 'w-[90%] max-w-lg h-auto rounded-lg shadow-lg ring ring-default overflow-hidden',
      title: 'font-newsreader text-xl font-semibold',
      description: 'text-base text-muted',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-xs',
    }"
  >
    <UButton
      icon="i-lucide-notebook-pen"
      variant="link"
      color="neutral"
      class="hover:text-primary cursor-pointer"
    />

    <template #body>
      <p class="mb-6">
        Your current phone number is: <strong>{{ userProfile?.phoneNumber }}</strong>
      </p>

      <UForm
        ref="formRef"
        class="flex flex-col gap-4 mx-auto w-full"
        :state
        :schema="updatePhoneNumberSchema"
        @error="$handleFormError"
        @submit="updatePhoneNumber($event)"
      >
        <UFormField
          label="New Phone Number"
          name="phoneNumber"
          required
          class="w-full"
        >
          <UInput
            v-model="state.phoneNumber"
            label="New Phone Number"
            placeholder="+1 (555) 987-6543"
            type="tel"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          required
          class="w-full"
        >
          <UInput
            v-model="state.password"
            label="Password"
            placeholder="Enter your current password"
            :type="showPassword ? 'text' : 'password'"
            size="lg"
            class="w-full"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                variant="link"
                color="neutral"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex gap-2.5">
        <UButton
          label="Cancel"
          color="error"
          variant="outline"
          class="cursor-pointer"
          @click="close"
        />

        <UButton
          :label="isLoading ? 'Submitting...' : 'Submit'"
          color="primary"
          icon="i-lucide-send"
          class="cursor-pointer"
          :loading="isLoading"
          @click="form?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>

</style>
