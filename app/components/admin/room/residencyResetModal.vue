<script setup lang="ts">
import { randomUUID } from "uncrypto";

const { hostelId } = defineProps<{
  hostelId: number;
}>();

const emit = defineEmits<{
  success: [];
}>();

const open = defineModel<boolean>({ default: false });

const toast = useToast();
const { $apiFetch } = useNuxtApp();

const isLoadingPreview = ref(false);
const isSubmitting = ref(false);
const isRollingBack = ref<string | null>(null);

const { settings: companySettings } = useCompanySettings();

const academicYear = ref("2025/2026");
const academicPeriod = ref<string | undefined>();

const periodOptions = [
  { label: "First Semester", value: "first semester" },
  { label: "Second Semester", value: "second semester" },
  { label: "Entire Year", value: "entire year" },
  { label: "Vacation Period", value: "vacation period" },
];

interface PreviewData {
  totalAffectedStudents: number;
  totalAffectedRooms: number;
  roomsFreedCount: number;
  roomsPartiallyVacatedCount: number;
  sampleAllocations: Array<{
    allocationId: number;
    studentName: string;
    studentEmail: string;
    roomNumber: string;
    currentOccupancy: number;
  }>;
}

const previewData = ref<PreviewData | null>(null);
const idempotencyKey = ref("");

interface RecentBatch {
  id: string;
  triggerSource: string;
  triggeredByName?: string | null;
  academicYear?: string | null;
  academicPeriod?: string | null;
  status: string;
  rollbackDeadline: string;
  createdAt: string;
}

const recentBatches = ref<RecentBatch[]>([]);

const isViewingDetails = ref(false);
const selectedBatchDetails = ref<any[]>([]);
const isLoadingDetails = ref(false);

async function viewBatchDetails(batchId: string) {
  isViewingDetails.value = true;
  isLoadingDetails.value = true;
  try {
    const res = await $apiFetch(
      "/api/room/admin/recentResidencyBatchDetails",
      {
        method: "GET",
        query: { batchId },
      },
    );
    selectedBatchDetails.value = res.data;
  }
  catch (err: any) {
    toast.add({
      title: "Details Error",
      description: err?.data?.message || err?.message || "Failed to load batch details.",
      color: "error",
    });
  }
  finally {
    isLoadingDetails.value = false;
  }
}

async function loadPreview() {
  if (!hostelId) return;

  isLoadingPreview.value = true;
  try {
    const res = await $apiFetch(
      "/api/room/admin/previewResidencyReset",
      {
        method: "POST",
        body: {
          hostelId,
          academicYear: academicYear.value || undefined,
          academicPeriod: academicPeriod.value || undefined,
        },
      },
    );

    previewData.value = res.data;
  }
  catch (err: any) {
    toast.add({
      title: "Preview Error",
      description: err?.data?.message || err?.message || "Failed to load residency reset preview.",
      color: "error",
    });
  }
  finally {
    isLoadingPreview.value = false;
  }
}

async function loadRecentBatches() {
  if (!hostelId) return;

  try {
    const res = await $apiFetch(
      "/api/room/admin/recentResidencyBatches",
      {
        method: "GET",
        query: {
          hostelId,
        },
      },
    ).catch(() => null);

    if (res?.data) {
      recentBatches.value = res.data;
    }
  }
  catch {}
}

watch(open, async (isOpen) => {
  if (isOpen) {
    if (companySettings.value?.defaultAcademicYear) {
      academicYear.value = companySettings.value.defaultAcademicYear;
    }
    if (companySettings.value?.defaultAcademicPeriod) {
      academicPeriod.value = companySettings.value.defaultAcademicPeriod;
    }
    idempotencyKey.value = randomUUID();

    await Promise.all([
      loadPreview(),
      loadRecentBatches(),
    ]);
  }
});

watch([academicYear, academicPeriod], async () => {
  if (open.value) await nextTick(() => loadPreview());
});

async function confirmReset() {
  if (!hostelId || !idempotencyKey.value) return;

  isSubmitting.value = true;
  try {
    const res = await $apiFetch(
      "/api/room/admin/resetResidency",
      {
        method: "POST",
        body: {
          hostelId,
          academicYear: academicYear.value || undefined,
          academicPeriod: academicPeriod.value || undefined,
          idempotencyKey: idempotencyKey.value,
        },
      },
    );

    toast.add({
      title: "Residency Reset Complete",
      description: res.message,
      color: "success",
    });

    emit("success");
    open.value = false;
  }
  catch (err: any) {
    toast.add({
      title: "Reset Failed",
      description: err?.data?.message || err?.message || "Failed to execute residency reset.",
      color: "error",
    });
  }
  finally {
    isSubmitting.value = false;
  }
}

async function rollbackBatch(batchId: string) {
  isRollingBack.value = batchId;
  try {
    const res = await $apiFetch(
      "/api/room/admin/rollbackResidencyReset",
      {
        method: "POST",
        body: { batchId },
      },
    );

    toast.add({
      title: "Rollback Complete",
      description: res.message,
      color: "success",
    });

    await Promise.all([
      loadPreview(),
      loadRecentBatches(),
    ]);

    emit("success");
  }
  catch (err: any) {
    toast.add({
      title: "Rollback Failed",
      description: err?.data?.message || err?.message || "Failed to rollback residency reset.",
      color: "error",
    });
  }
  finally {
    isRollingBack.value = null;
  }
}

const previewDataItems = computed(() => {
  return [
    {
      label: "Students Affected",
      value: previewData.value?.totalAffectedStudents,
      color: "highlighted",
    },
    {
      label: "Rooms Affected",
      value: previewData.value?.totalAffectedRooms,
      color: "highlighted",
    },
    {
      label: "Rooms Freed",
      value: previewData.value?.roomsFreedCount,
      color: "success",
    },
    {
      label: "Partially Vacated",
      value: previewData.value?.roomsPartiallyVacatedCount,
      color: "warning",
    },
  ];
});
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      content: 'max-w-4xl rounded-lg shadow-lg',
      title: 'font-newsreader text-xl font-semibold',
      footer: 'justify-end',
      close: 'cursor-pointer',
    }"
  >
    <UButton
      label="Reset Residency"
      icon="i-lucide-rotate-ccw"
      color="warning"
      variant="subtle"
      size="lg"
      class="justify-center items-center w-full sm:w-auto cursor-pointer"
    />

    <template #title>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-rotate-ccw"
          class="size-6 text-warning"
        />

        <span>Academic Year & Residency Reset</span>
      </div>
    </template>

    <template #body>
      <div
        v-auto-animate
        class="space-y-5"
      >
        <p class="text-muted text-base">
          Reset student residencies for the selected academic period. This will set active allocations to completed/expired, free up room capacity, and clear student active allocation flags.
        </p>

        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Academic Year"
            class="w-full"
          >
            <UInput
              v-model="academicYear"
              placeholder="e.g. 2025/2026"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Academic Period (Optional)">
            <USelectMenu
              v-model="academicPeriod"
              :items="periodOptions"
              value-key="value"
              placeholder="All Periods (Optional)"
              clear
              class="w-full cursor-pointer"
              :ui="{
                item: 'cursor-pointer',
                trailingClear: 'cursor-pointer',
              }"
            />
          </UFormField>
        </div>

        <div
          v-if="isLoadingPreview"
          class="flex justify-center py-6"
        >
          <UIcon
            name="i-lucide-loader"
            class="size-8 text-primary animate-spin"
          />
        </div>

        <div
          v-else-if="previewData"
          class="space-y-4"
        >
          <div class="gap-3 grid grid-cols-2 sm:grid-cols-4">
            <div
              v-for="item in previewDataItems"
              :key="item.label"
              class="bg-elevated p-3 border border-muted rounded-lg text-center"
            >
              <p class="text-muted text-xs">
                {{ item.label }}
              </p>

              <p :class="`font-bold text-${item.color} text-xl`">
                {{ item.value }}
              </p>
            </div>
          </div>

          <div
            v-if="previewData.sampleAllocations.length"
            class="space-y-2"
          >
            <p class="font-medium text-muted text-xs">
              Sample Affected Allocations:
            </p>

            <div class="border border-muted rounded-md divide-y divide-muted max-h-36 overflow-y-auto text-xs">
              <div
                v-for="item in previewData.sampleAllocations"
                :key="item.allocationId"
                class="flex justify-between items-center p-2"
              >
                <span>{{ item.studentName }} ({{ item.studentEmail }})</span>

                <UBadge
                  variant="subtle"
                  size="sm"
                >
                  Room {{ item.roomNumber }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="recentBatches.length"
          class="space-y-2 pt-4 border-muted border-t"
        >
          <p class="font-semibold text-muted text-xs">
            Recent Resets (Available for 48h Undo):
          </p>

          <div class="space-y-2">
            <div
              v-for="batch in recentBatches"
              :key="batch.id"
              class="flex justify-between items-center bg-subtle p-2.5 border border-muted rounded-md text-xs"
            >
              <div>
                <p class="font-medium">
                  {{ batch.triggerSource.toUpperCase() }} Reset by {{ batch.triggeredByName || "System Cron" }}
                </p>

                <p class="text-muted">
                  {{ new Date(batch.createdAt).toLocaleString() }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  label="Details"
                  icon="i-lucide-list"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="viewBatchDetails(batch.id)"
                />

                <UButton
                  v-if="batch.status === 'committed'"
                  label="Undo Reset"
                  icon="i-lucide-rotate-ccw"
                  size="xs"
                  color="warning"
                  variant="subtle"
                  :loading="isRollingBack === batch.id"
                  @click="rollbackBatch(batch.id)"
                />

                <UBadge
                  v-else
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  Rolled Back
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="isSubmitting"
          @click="close"
        />

        <UButton
          label="Execute Reset"
          icon="i-lucide-rotate-ccw"
          color="warning"
          :loading="isSubmitting"
          :disabled="!previewData || previewData.totalAffectedStudents === 0"
          @click="confirmReset"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isViewingDetails"
    :ui="{ content: 'max-w-2xl rounded-lg shadow-lg', title: 'font-newsreader text-lg font-semibold' }"
  >
    <template #title>
      Residency Reset Batch Details
    </template>

    <template #body>
      <div
        v-if="isLoadingDetails"
        class="flex justify-center py-6"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-8 text-primary animate-spin"
        />
      </div>

      <div
        v-else
        class="space-y-4 max-h-[60vh] overflow-y-auto"
      >
        <div
          v-if="!selectedBatchDetails.length"
          class="text-muted text-center"
        >
          No details found.
        </div>

        <div
          v-else
          class="border border-muted rounded-md divide-y divide-muted text-xs"
        >
          <div
            v-for="log in selectedBatchDetails"
            :key="log.logId"
            class="flex justify-between items-center p-3"
          >
            <div>
              <p class="font-medium text-sm">
                {{ log.userName }} ({{ log.userEmail }})
              </p>

              <p class="mt-0.5 text-muted">
                Previous Status: <span class="font-medium text-foreground">{{ log.previousAllocationStatus }}</span>
              </p>
            </div>

            <UBadge
              variant="subtle"
              size="sm"
            >
              Room {{ log.roomNumber }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
