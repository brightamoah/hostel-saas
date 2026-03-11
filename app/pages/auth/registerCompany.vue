<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: "onboard",
  middleware: ["auth-redirect"],
});

const toast = useToast();
const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const activeTab = ref<"0" | "1">("0");
const isOwnerComplete = ref(false);

const items = computed<TabsItem[]>(() => [
  {
    label: "Owner",
    icon: "i-lucide-user",
    slot: "owner" as const,
  },
  {
    label: "Company",
    icon: "i-lucide-building-2",
    slot: "company" as const,
    disabled: !isOwnerComplete.value,

  },
]);

const {
  passwordFieldType,
  confirmPasswordFieldType,
  togglePasswordFieldType,
  toggleConfirmPasswordFieldType,
} = useTogglePasswordField();

const companyStore = useCompanyStore();
const {
  createCompanyState,
  isLoading,
  isUploading,
} = storeToRefs(companyStore);

const {
  removeHostelLogo,
  submitRegistration,
  regenerateJoinCode,
} = companyStore;

const canGoNext = computed(() => ownerSchema.safeParse(createCompanyState.value).success);

async function nextTab() {
  const result = ownerSchema.safeParse(createCompanyState.value);
  if (!result.success) {
    toast.add({
      title: "Fix owner details",
      description: result.error.issues[0]?.message ?? "Please check the form.",
      color: "error",
    });
    return;
  }
  isOwnerComplete.value = true;
  activeTab.value = "1";
}

async function copyJoinCode() {
  if (!createCompanyState.value.joinCode) return;

  try {
    await navigator.clipboard.writeText(createCompanyState.value.joinCode);
    toast.add({
      title: "Copied!",
      description: "Join code copied to clipboard.",
      color: "success",
      icon: "i-lucide-copy-check",
      duration: 2000,
    });
  }
  catch {
    toast.add({
      title: "Copy Failed",
      description: "Could not copy to clipboard.",
      color: "error",
    });
  }
}
</script>

<template>
  <UPageSection
    title="Register Your Company"
    description="Create an account for your company to manage your hostels and bookings."
    class="bg-transparent"
    :ui="{
      title: 'font-newsreader capitalize text-2xl md:text-3xl lg:text-4xl italics',
      description: '-mt-0.5',
    }"
  >
    <template #headline>
      <div class="text-center">
        <UBadge
          variant="subtle"
          class="justify-center items-center"
        >
          <UIcon
            name="i-lucide-building-2"
            class="mr-1 size-4"
          />
          Company Registration
        </UBadge>
      </div>
    </template>

    <div class="flex flex-col sm:justify-between sm:items-center md:-mt-6">
      <UForm
        :schema="registerCompanySchema"
        :state="createCompanyState"
        class="bg-transparent shadow-md backdrop-blur-xl p-2 md:p-4 border border-muted rounded-lg w-full max-w-4xl"
        @submit.prevent="submitRegistration"
        @error="useHandleFormError"
      >
        <UTabs
          v-model="activeTab"
          :items="items"
          :ui="{ trigger: 'cursor-pointer' }"
        >
          <template #owner>
            <div class="flex md:flex-row flex-col justify-between gap-5 mt-3 px-4">
              <UFormField
                required
                label="Full Name"
                name="name"
                class="w-full"
              >
                <UInput
                  v-model="createCompanyState.name"
                  placeholder="Enter your full name"
                  icon="i-lucide-user"
                  class="w-full"
                  :size="isMobile ? 'lg' : 'xl'"
                />
              </UFormField>
            </div>

            <div class="flex md:flex-row flex-col justify-between gap-5 mt-5 px-4">
              <UFormField
                required
                label="Email Address"
                name="email"
                class="w-full"
              >
                <UInput
                  v-model="createCompanyState.email"
                  placeholder="Enter your email address"
                  icon="i-lucide-mail"
                  class="w-full"
                  :size="isMobile ? 'lg' : 'xl'"
                />
              </UFormField>

              <UFormField
                required
                label="Phone Number"
                name="phoneNumber"
                class="w-full"
              >
                <UInput
                  v-model="createCompanyState.phoneNumber"
                  placeholder="Enter your phone number"
                  icon="i-lucide-phone"
                  class="w-full"
                  type="tel"
                  :size="isMobile ? 'lg' : 'xl'"
                />
              </UFormField>
            </div>

            <div class="flex md:flex-row flex-col justify-between gap-5 mt-5 px-4">
              <UFormField
                required
                label="Password"
                name="password"
                class="w-full"
              >
                <UInput
                  v-model="createCompanyState.password"
                  placeholder="Enter your password"
                  icon="i-lucide-lock"
                  class="w-full"
                  :type="passwordFieldType"
                  :size="isMobile ? 'lg' : 'xl'"
                >
                  <template #trailing>
                    <UButton
                      variant="ghost"
                      color="neutral"
                      class="p-1.5 rounded-full h-auto cursor-pointer"
                      :icon="passwordFieldType === 'password' ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                      @click="togglePasswordFieldType"
                    />
                  </template>
                </UInput>
              </UFormField>

              <UFormField
                required
                label="Confirm Password"
                name="confirmPassword"
                class="w-full"
              >
                <UInput
                  v-model="createCompanyState.confirmPassword"
                  placeholder="Enter your password again"
                  icon="i-lucide-lock"
                  class="w-full"
                  :type="confirmPasswordFieldType"
                  :size="isMobile ? 'lg' : 'xl'"
                >
                  <template #trailing>
                    <UButton
                      variant="ghost"
                      color="neutral"
                      class="p-1.5 rounded-full h-auto cursor-pointer"
                      :icon="confirmPasswordFieldType === 'password' ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                      @click="toggleConfirmPasswordFieldType"
                    />
                  </template>
                </UInput>
              </UFormField>
            </div>

            <div class="flex justify-end mt-3 pt-2">
              <UButton
                color="primary"
                :disabled="!canGoNext || isLoading"
                :loading="isLoading"
                class="justify-center cursor-pointer"
                icon="i-lucide-arrow-right"
                label="Continue to Company"
                type="button"
                @click="nextTab"
              />
            </div>
          </template>

          <template #company>
            <div class="space-y-5 mt-3 px-4">
              <div class="gap-5 grid grid-cols-1 md:grid-cols-2">
                <UFormField
                  required
                  label="Company Name / Organization Name"
                  name="companyName"
                  class="w-full"
                >
                  <UInput
                    v-model="createCompanyState.companyName"
                    placeholder="e.g. Kings Hostels Ltd"
                    icon="i-lucide-building-2"
                    class="w-full"
                    :size="isMobile ? 'lg' : 'xl'"
                  />
                </UFormField>

                <UFormField
                  required
                  label="Company Slug"
                  name="companySlug"
                  class="w-full"
                >
                  <UInput
                    v-model="createCompanyState.companySlug"
                    placeholder="e.g. kings-hostels"
                    icon="i-lucide-hash"
                    class="w-full"
                    :size="isMobile ? 'lg' : 'xl'"
                  />

                  <template #help>
                    <span class="text-muted text-xs">
                      Use kebab-case. This is used internally and for future company URLs.
                    </span>
                  </template>
                </UFormField>
              </div>

              <UCard class="border border-muted">
                <template #header>
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="font-medium">
                        Create your first hostel portal
                      </p>

                      <p class="text-muted text-sm">
                        This creates the student portal at
                        <span class="font-mono">/h/&lt;hostel-slug&gt;</span>
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <USwitch
                        v-model="createCompanyState.createHostelNow"
                        :label="createCompanyState.createHostelNow ? 'Yes' : 'No'"
                        size="xl"
                        :ui="{
                          base: 'cursor-pointer',
                        }"
                      />
                    </div>
                  </div>
                </template>

                <div
                  v-auto-animate
                  class="w-full"
                >
                  <div
                    v-if="createCompanyState.createHostelNow"
                    class="gap-5 grid grid-cols-1 md:grid-cols-2"
                  >
                    <UFormField
                      label="Hostel Name"
                      name="hostelName"
                      class="w-full"
                    >
                      <UInput
                        v-model="createCompanyState.hostelName"
                        placeholder="e.g. Kings Hostel - Accra"
                        icon="i-lucide-home"
                        class="w-full"
                        :size="isMobile ? 'lg' : 'xl'"
                      />
                    </UFormField>

                    <UFormField
                      label="Hostel Slug"
                      name="hostelSlug"
                      class="w-full"
                    >
                      <UInput
                        v-model="createCompanyState.hostelSlug"
                        placeholder="e.g. kings-hostel-accra"
                        icon="i-lucide-hash"
                        class="w-full"
                        :size="isMobile ? 'lg' : 'xl'"
                      />

                      <template #help>
                        <span class="text-muted text-xs">
                          Portal: <span class="font-mono">/h/{{ createCompanyState.hostelSlug || "your-hostel" }}</span>
                        </span>
                      </template>
                    </UFormField>

                    <UFormField
                      label="Hostel Support Email"
                      name="supportEmail"
                      class="w-full"
                    >
                      <UInput
                        v-model="createCompanyState.supportEmail"
                        placeholder="e.g. support@kingshostel.com"
                        icon="i-lucide-mail"
                        class="w-full"
                        :size="isMobile ? 'lg' : 'xl'"
                      />
                    </UFormField>

                    <UFormField
                      label="Hostel Support Phone Number"
                      name="supportPhone"
                      class="w-full"
                    >
                      <UInput
                        v-model="createCompanyState.supportPhone"
                        placeholder="e.g. +233 55 000 0000"
                        icon="i-lucide-phone"
                        class="w-full"
                        type="tel"
                        :size="isMobile ? 'lg' : 'xl'"
                      />
                    </UFormField>

                    <div class="flex flex-col gap-3">
                      <UFormField
                        label="Hostel Join Code"
                        name="joinCode"
                        class="w-full"
                      >
                        <div class="flex gap-2">
                          <UInput
                            v-model="createCompanyState.joinCode"
                            placeholder="e.g. KINGS2024"
                            icon="i-lucide-key-round"
                            class="flex-1 font-mono uppercase tracking-wider"
                            :size="isMobile ? 'lg' : 'xl'"
                            maxlength="10"
                          />

                          <UTooltip text="Regenerate code">
                            <UButton
                              variant="outline"
                              color="neutral"
                              icon="i-lucide-refresh-cw"
                              :size="isMobile ? 'lg' : 'xl'"
                              class="cursor-pointer"
                              @click="regenerateJoinCode"
                            />
                          </UTooltip>

                          <UTooltip text="Copy code">
                            <UButton
                              variant="outline"
                              color="neutral"
                              icon="i-lucide-copy"
                              :size="isMobile ? 'lg' : 'xl'"
                              class="cursor-pointer"
                              :disabled="!createCompanyState.joinCode"
                              @click="copyJoinCode"
                            />
                          </UTooltip>
                        </div>

                        <template #help>
                          <span class="text-muted text-xs">
                            Students use this code to join your hostel.
                          </span>
                        </template>
                      </UFormField>

                      <UFormField
                        label="Hostel Address"
                        name="hostelAddress"
                        class="w-full"
                      >
                        <UTextarea
                          v-model="createCompanyState.hostelAddress"
                          placeholder="e.g. 123 Main St, Accra"
                          icon="i-lucide-map-pin"
                          class="w-full"
                          :size="isMobile ? 'lg' : 'xl'"
                          :rows="3"
                        />
                      </UFormField>
                    </div>

                    <UFormField
                      label="Hostel Logo / Image"
                      name="hostelLogo"
                      class="w-full"
                    >
                      <UFileUpload
                        v-model="createCompanyState.hostelLogo"
                        icon="i-lucide-image"
                        label="Drop your hostel Logo or image"
                        description="SVG, PNG, JPG or GIF (max. 2MB)"
                        class="w-full min-h-43"
                        accept="image/png, image/jpeg, image/webp, image/jpg"
                        :interactive="false"
                        :disabled="isUploading || isLoading"
                        :file-delete="{
                          class: 'cursor-pointer hover:bg-error hover:text-white rounded size-5 hover:border-error text-center font-bold',
                          onClick: removeHostelLogo,
                        }"
                        :ui="{
                          base: 'border-3 border-muted rounded-md p-4 cursor-pointer',
                        }"
                      >
                        <template #actions="{ open }">
                          <UButton
                            label="Select From Your Device"
                            icon="i-lucide-upload"
                            color="neutral"
                            variant="outline"
                            class="cursor-pointer"
                            :disabled="isUploading || isLoading"
                            @click="open()"
                          />
                        </template>
                      </UFileUpload>
                    </UFormField>
                  </div>

                  <div
                    v-else
                    class="text-muted text-sm capitalize"
                  >
                    No problem you - can create hostels later from the admin dashboard.
                  </div>
                </div>
              </UCard>

              <!-- Actions -->
              <div class="flex md:flex-row flex-col justify-between gap-3 pt-2">
                <UButton
                  variant="subtle"
                  icon="i-lucide-arrow-left"
                  label="Back"
                  type="button"
                  class="flex justify-center items-center cursor-pointer"
                  :disabled="isLoading"
                  @click="activeTab = '0'"
                />

                <UButton
                  color="primary"
                  icon="i-lucide-building-2"
                  :label="isLoading ? 'Registering...' : 'Register Company'"
                  type="submit"
                  class="flex justify-center items-center cursor-pointer"
                  :loading="isLoading"
                  :disabled="isLoading"
                />
              </div>
            </div>
          </template>
        </UTabs>
      </UForm>
    </div>
  </UPageSection>
</template>

<style scoped>
</style>
