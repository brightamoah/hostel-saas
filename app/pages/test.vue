<script lang="ts" setup>
const { $apiFetch } = useNuxtApp();
const toast = useToast();

const toEmail = ref("");
const htmlResult = ref("");
const isSending = ref(false);

async function getTemplate() {
  if (!toEmail.value) {
    toast.add({
      title: "Please enter an email address to test.",
      color: "error",
    });
    return;
  }

  isSending.value = true;
  try {
    const res = await $apiFetch("/api/emails/send", {
      method: "POST",
      body: {
        name: "verifyEmail",
        to: toEmail.value,
        props: {
          userName: "Amoah",
          verificationUrl: "https://kayanest.app/verify?token=123",
          hostelName: "Kayanest Hostels",
        },
      },
    });

    htmlResult.value = res.html;
    toast.add({
      title: "Test email sent successfully! Check your inbox.",
      color: "success",
    });
  }
  catch (error) {
    console.error(error);
    toast.add({
      title: "Failed to send the email.",
      color: "error",
    });
  }
  finally {
    isSending.value = false;
  }
}

definePageMeta({
  layout: "settings",
});
</script>

<template>
  <div class="flex flex-col gap-4 mx-auto p-6 max-w-2xl">
    <h1 class="font-bold text-xl">
      Email Template Test
    </h1>

    <UFormField label="Test Email Address">
      <UInput
        v-model="toEmail"
        placeholder="you@example.com"
        type="email"
      />
    </UFormField>

    <UButton
      :loading="isSending"
      @click="getTemplate()"
    >
      Send Test Email
    </UButton>

    <div
      v-if="htmlResult"
      class="bg-white dark:bg-gray-800 mt-8 p-4 border rounded-lg"
    >
      <h2 class="mb-4 font-semibold text-lg">
        HTML Preview
      </h2>

      <div
        class="all-initial"
        v-html="htmlResult"
      />
    </div>
  </div>
</template>

<style scoped>
.all-initial {
  all: initial;
}
</style>
