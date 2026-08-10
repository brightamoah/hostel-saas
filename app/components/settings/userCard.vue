<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";
import { profilePictureSchema } from "~~/shared/utils/schema";

const emit = defineEmits<{
  "update:avatar": [file: File];
}>();

const toast = useToast();
const { userInitials, userBadgeColor, avatarBgColor } = useUseUserItems();

const { user, fetch: fetchSession } = usePortalUserSession();

const { $apiFetch } = useNuxtApp();

const userProfile = inject(userProfileKey);

type UserItemId = "email" | "role" | "joined" | "hostel" | "company" | "companyRole";

interface UserItem {
  id: UserItemId;
  label: string;
  value: string | number | undefined;
}

const userItems = computed<UserItem[]>(() => {
  const items: UserItem[] = [
    {
      id: "email",
      label: "Email:",
      value: user.value?.email,
    },
    {
      id: "role",
      label: "Role:",
      value: user.value?.role,
    },
    {
      id: "joined",
      label: "Joined:",
      value: user.value?.createdAt
        ? useDateFormat(new Date(user.value.createdAt), "Do MMMM, YYYY").value
        : undefined,
    },
    {
      id: "hostel",
      label: "Hostel:",
      value: userProfile?.value?.hostel ?? "N/A",
    },
  ];

  if (user.value?.role === "admin") {
    items.push(
      {
        id: "company",
        label: "Company:",
        value: userProfile?.value?.company ?? "N/A",
      },
    );
  }

  return items;
});

// --- avatar upload & remove handling ---

const openModal = ref(false);
const openRemoveModal = ref(false);

const fileInputRef = ref<HTMLInputElement>();
const previewUrl = ref<string>();
const pendingFile = ref<File>();
const isSubmitting = ref(false);

const avatarSrc = computed(() => previewUrl.value ?? user.value?.image ?? "");

function openFilePicker() {
  fileInputRef.value?.click();
}

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);

  previewUrl.value = undefined;
}

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  const result = await profilePictureSchema.safeParseAsync(file);
  if (!result.success) {
    const errorMsg = result.error.issues.map(i => i.message).join(", ");
    toast.add({
      title: "Invalid Image File",
      description: errorMsg,
      color: "error",
    });
    target.value = "";
    return;
  }

  clearPreview();
  previewUrl.value = URL.createObjectURL(file);
  pendingFile.value = file;

  // reset so selecting the same file again still fires a change event
  target.value = "";
}

async function submitAvatar() {
  if (!pendingFile.value) return;

  const validation = await profilePictureSchema.safeParseAsync(pendingFile.value);
  if (!validation.success) {
    toast.add({
      title: "Invalid Image File",
      description: validation.error.issues.map(i => i.message).join(", "),
      color: "error",
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const formData = new FormData();
    formData.append("file", pendingFile.value);

    const response = await $apiFetch<{ success: boolean; message: string; url: string }>("/api/user/updateProfilePicture", {
      method: "POST",
      body: formData,
    });

    await fetchSession();

    toast.add({
      title: "Success",
      description: response.message || "Profile picture updated successfully.",
      color: "success",
    });

    emit("update:avatar", pendingFile.value);
    clearPreview();
    pendingFile.value = undefined;
    openModal.value = false;
  }
  catch (error: any) {
    const message = error?.data?.message || error?.message || "Failed to update profile picture.";
    toast.add({
      title: "Upload Failed",
      description: message,
      color: "error",
    });
  }
  finally {
    isSubmitting.value = false;
  }
}

async function removeProfilePicture() {
  isSubmitting.value = true;
  try {
    const response = await $apiFetch<{ success: boolean; message: string }>("/api/user/removeProfilePicture", {
      method: "POST",
    });

    await fetchSession();

    toast.add({
      title: "Success",
      description: response.message || "Profile picture removed successfully.",
      color: "success",
    });

    clearPreview();
    pendingFile.value = undefined;
    openRemoveModal.value = false;
  }
  catch (error: any) {
    const message = error?.data?.message || error?.message || "Failed to remove profile picture.";
    toast.add({
      title: "Action Failed",
      description: message,
      color: "error",
    });
  }
  finally {
    isSubmitting.value = false;
  }
}

function removeSelection() {
  clearPreview();
  pendingFile.value = undefined;
}

onBeforeUnmount(() => {
  clearPreview();
});
</script>

<template>
  <UCard
    variant="subtle"
    class="flex flex-col shadow-md w-full min-w-64 md:max-w-80"
    :ui="{
      body: 'p-3 sm:p-4',
    }"
  >
    <div class="flex flex-col items-center gap-3 py-4">
      <div
        class="group relative rounded-full size-30 cursor-pointer"
        role="button"
        tabindex="0"
        aria-label="Change profile picture"
        @click="openFilePicker"
        @keydown.enter="openFilePicker"
        @keydown.space.prevent="openFilePicker"
      >
        <UAvatar
          :src="avatarSrc"
          :alt="user?.name"
          :text="userInitials"
          :ui="{
            fallback: `text-white text-4xl`,
          }"
          :style="`background-color: ${avatarBgColor}`"
          class="size-30"
        />

        <div class="absolute inset-0 flex justify-center items-center bg-black/50 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 rounded-full transition-opacity">
          <UIcon
            name="i-lucide-camera"
            class="size-6 text-white"
          />
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        >
      </div>

      <div class="flex justify-center items-center gap-2 pt-1">
        <template v-if="pendingFile">
          <UButton
            label="Cancel"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="subtle"
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="removeSelection"
          />

          <AppConfirmationModal
            v-model:open="openModal"
            type="confirm"
            title="Upload Profile Picture"
            description="Are you sure you want to upload this profile picture?"
            :confirm-loading="isSubmitting"
            @confirm="submitAvatar"
          >
            <UButton
              label="Upload Image"
              icon="i-lucide-cloud-upload"
              size="xs"
              color="primary"
              class="cursor-pointer"
              :disabled="isSubmitting"
            />
          </AppConfirmationModal>
        </template>

        <template v-else-if="user?.image">
          <AppConfirmationModal
            v-model:open="openRemoveModal"
            type="delete"
            title="Remove Profile Picture"
            description="Are you sure you want to remove your profile picture? Your default text initials will be displayed instead."
            :confirm-loading="isSubmitting"
            @confirm="removeProfilePicture"
          >
            <UButton
              label="Remove"
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="subtle"
              class="cursor-pointer"
              :disabled="isSubmitting"
            />
          </AppConfirmationModal>

          <UButton
            label="Change Image"
            icon="i-lucide-camera"
            size="xs"
            color="primary"
            variant="subtle"
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="openFilePicker"
          />
        </template>

        <template v-else>
          <UButton
            label="Upload Image"
            icon="i-lucide-cloud-upload"
            size="xs"
            color="primary"
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="openFilePicker"
          />
        </template>
      </div>

      <div class="flex items-center gap-1.5 mt-4">
        <p class="font-semibold text-highlighted text-xl">
          {{ user?.name }}
        </p>

        <UTooltip
          :text="user?.emailVerified ? 'Email Verified' : 'Email Not Verified'"
          arrow
        >
          <UIcon
            v-if="user?.emailVerified"
            name="i-lucide-badge-check"
            class="size-5 text-success shrink-0"
          />

          <UIcon
            v-else
            name="i-lucide-badge-x"
            class="size-5 text-error shrink-0"
          />
        </UTooltip>
      </div>

      <USeparator size="sm" />

      <div class="flex flex-col gap-3 py-4 w-full text-sm">
        <DashboardDetailItem
          v-for="item in userItems"
          :key="item.id"
          :label="item.label"
          :value="item.value ?? ''"
          class="gap-3 w-full"
          label-class="font-medium text-muted shrink-0"
        >
          <template #default>
            <UBadge
              v-if="item.id === 'role'"
              variant="subtle"
              :color="userBadgeColor"
              class="justify-center items-center w-fit"
            >
              {{ item.value?.toString().toUpperCase() }}
            </UBadge>

            <span v-else>{{ item.value }}</span>
          </template>
        </DashboardDetailItem>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
/*
  Height/opacity transition for the submit/remove row.
  The grid-rows 0fr -> 1fr trick animates an "auto" height smoothly,
  which a plain max-height transition can't do without guessing a cap.
*/
.grow-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows 0.25s ease,
    opacity 0.2s ease;
}

.grow-wrapper > * {
  overflow: hidden;
  min-height: 0;
}

.grow-enter-from,
.grow-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.grow-enter-to,
.grow-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}
</style>
