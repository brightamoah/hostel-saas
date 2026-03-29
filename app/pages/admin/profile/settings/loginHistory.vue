<script setup lang="ts">
const {
  user = {
    name: "Alex Johnson",
    email: "alex@example.com",
    role: "Admin",
    location: "New York, USA",
    bio: "Building great things with Nuxt UI.",
    avatar: "https://github.com/nuxt.png",
  },
} = defineProps<{
  user?: {
    name?: string;
    email?: string;
    role?: string;
    location?: string;
    bio?: string;
    avatar?: string;
  };
}>();

definePageMeta({
  layout: {
    name: "settings",
    props: {
      title: "Change Password",
    },
  },
});

// Avatar state
const avatarSrc = ref(user?.avatar ?? "");
const uploadOpen = ref(false);
const uploadedFile = ref<File | null>(null);
const isUploading = ref(false);

function onFileChange(file: File | null) {
  if (!file) return;
  uploadedFile.value = file;
  // Preview immediately
  avatarSrc.value = URL.createObjectURL(file);
}

async function confirmUpload() {
  if (!uploadedFile.value) return;
  isUploading.value = true;
  try {
    // TODO: upload to your server/storage
    // await uploadAvatar(uploadedFile.value)
    await new Promise(resolve => setTimeout(resolve, 1000)); // simulated delay
    uploadOpen.value = false;
  }
  finally {
    isUploading.value = false;
  }
}

function cancelUpload() {
  uploadOpen.value = false;
  uploadedFile.value = null;
  avatarSrc.value = user?.avatar ?? "";
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <!-- Banner -->
    <template #header>
      <div class="bg-linear-to-br from-primary-400 to-primary-600 -mx-px -mt-px rounded-t-[calc(var(--ui-radius)*2)] h-24" />
    </template>

    <div class="flex flex-col items-center gap-4 -mt-16">
      <!-- Avatar with upload trigger -->
      <div
        class="group relative cursor-pointer"
        @click="uploadOpen = true"
      >
        <UAvatar
          :src="avatarSrc"
          :alt="user.name"
          size="3xl"
          class="shadow-lg ring-[--ui-bg] ring-4"
        />
        <!-- Hover overlay -->
        <div class="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
          <UIcon
            name="i-lucide-camera"
            class="size-6 text-white"
          />
        </div>
      </div>

      <!-- User info -->
      <div class="space-y-1 text-center">
        <h3 class="font-semibold text-[--ui-text-highlighted] text-lg">
          {{ user.name }}
        </h3>

        <p class="text-[--ui-text-muted] text-sm">
          {{ user.email }}
        </p>

        <UBadge
          :label="user.role"
          variant="subtle"
          size="sm"
          class="mt-1"
        />
      </div>

      <!-- Meta details -->
      <div class="space-y-2 pt-4 border-[--ui-border] border-t w-full">
        <div
          v-if="user.location"
          class="flex items-center gap-2 text-[--ui-text-toned] text-sm"
        >
          <UIcon
            name="i-lucide-map-pin"
            class="size-4 shrink-0"
          />

          <span>{{ user.location }}</span>
        </div>

        <div
          v-if="user.bio"
          class="flex items-start gap-2 text-[--ui-text-toned] text-sm"
        >
          <UIcon
            name="i-lucide-info"
            class="mt-0.5 size-4 shrink-0"
          />

          <span>{{ user.bio }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 w-full">
        <UButton
          block
          variant="outline"
          color="neutral"
          icon="i-lucide-pencil"
        >
          Edit Profile
        </UButton>

        <UButton
          block
          icon="i-lucide-share-2"
          variant="subtle"
        >
          Share
        </UButton>
      </div>
    </div>

    <!-- Avatar upload modal -->
    <UModal
      v-model:open="uploadOpen"
      title="Update Profile Picture"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UFileUpload
          v-model="uploadedFile"
          accept="image/*"
          variant="area"
          icon="i-lucide-image"
          label="Drop your photo here"
          description="PNG, JPG or WEBP (max. 2MB)"
          :preview="true"
          :multiple="false"
          @update:model-value="() => onFileChange"
        />
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          @click="cancelUpload"
        >
          Cancel
        </UButton>

        <UButton
          :disabled="!uploadedFile"
          :loading="isUploading"
          icon="i-lucide-upload"
          @click="confirmUpload"
        >
          Upload
        </UButton>
      </template>
    </UModal>
  </UCard>
</template>
