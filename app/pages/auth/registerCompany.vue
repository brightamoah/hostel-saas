<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: "onboard",
  middleware: ["auth-redirect"],
});

const { $handleFormError } = useNuxtApp();

const toast = useToast();
const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const activeTab = ref<"owner" | "company">("owner");
const isOwnerComplete = ref(false);

const items = computed<TabsItem[]>(() => [
  {
    label: "Owner",
    value: "owner",
    icon: "i-lucide-user",
    slot: "owner" as const,
  },
  {
    label: "Company",
    value: "company",
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
  removeCompanyHostelLogo,
  submitRegistration,
  regenerateCompanyJoinCode,
  copyJoinCode,
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
  activeTab.value = "company";
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
    <div class="top-8 left-8 z-10 absolute">
      <AppSpotlightButton
        aria-label="scroll to top button"
        class="flex justify-center items-center p-1 size-10 text-muted transition-all duration-200 cursor-pointer"
        rounded
        @click="navigateTo({ name: 'index' })"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="z-20 size-6"
        />
      </AppSpotlightButton>
    </div>

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

    <UAlert
      title="Only register here if you are the owner of a company or hostel."
      description="If you are a staff member or manager, please ask your company owner or admin to create an account for you from the admin dashboard."
      class="mx-auto md:-mt-8 max-w-4xl"
      variant="subtle"
      color="info"
    />

    <div class="flex flex-col sm:justify-between sm:items-center md:-mt-8">
      <UForm
        :schema="registerCompanySchema"
        :state="createCompanyState"
        class="bg-transparent shadow-md backdrop-blur-xl p-2 md:p-4 border border-muted rounded-lg w-full max-w-4xl"
        @submit.prevent="submitRegistration"
        @error="$handleFormError"
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
                  <CompanyHostelForm
                    v-if="createCompanyState.createHostelNow"
                    v-model:name="createCompanyState.hostelName"
                    v-model:slug="createCompanyState.hostelSlug"
                    v-model:support-email="createCompanyState.supportEmail"
                    v-model:support-phone="createCompanyState.supportPhone"
                    v-model:join-code="createCompanyState.joinCode"
                    v-model:address="createCompanyState.hostelAddress"
                    v-model:logo-file="createCompanyState.hostelLogo"
                    :is-loading
                    :is-uploading
                    :copy-join-code="() => copyJoinCode(createCompanyState.joinCode)"
                    :remove-hostel-logo="removeCompanyHostelLogo"
                    :regenerate-join-code="regenerateCompanyJoinCode"
                  />

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
                  @click="activeTab = 'owner'"
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
