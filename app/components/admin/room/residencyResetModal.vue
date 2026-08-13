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

async function loadPreview() {
  if (!hostelId) return;

  isLoadingPreview.value = true;
  try {
    const res = await $apiFetch("/api/room/admin/previewResidencyReset", {
      method: "POST",
      body: {
        hostelId,
        academicYear: academicYear.value || undefined,
        academicPeriod: academicPeriod.value || undefined,
      },
    });

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
    const res = await $apiFetch(`/api/room/admin/recentResidencyBatches?hostelId=${hostelId}`, {
      method: "GET",
    }).catch(() => null);

    if (res?.data) {
      recentBatches.value = res.data;
    }
  }
  catch {}
}

watch(open, (isOpen) => {
  if (isOpen) {
    if (companySettings.value?.defaultAcademicYear) {
      academicYear.value = companySettings.value.defaultAcademicYear;
    }
    if (companySettings.value?.defaultAcademicPeriod) {
      academicPeriod.value = companySettings.value.defaultAcademicPeriod;
    }
    idempotencyKey.value = randomUUID();
    void loadPreview();
    void loadRecentBatches();
  }
});

watch([academicYear, academicPeriod], async () => {
  if (open.value) await nextTick(() => loadPreview());
});

async function confirmReset() {
  if (!hostelId || !idempotencyKey.value) return;

  isSubmitting.value = true;
  try {
    const res = await $apiFetch("/api/room/admin/resetResidency", {
      method: "POST",
      body: {
        hostelId,
        academicYear: academicYear.value || undefined,
        academicPeriod: academicPeriod.value || undefined,
        idempotencyKey: idempotencyKey.value,
      },
    });

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
    const res = await $apiFetch<{ success: boolean; message: string }>("/api/room/admin/rollbackResidencyReset", {
      method: "POST",
      body: { batchId },
    });

    toast.add({
      title: "Rollback Complete",
      description: res.message,
      color: "success",
    });

    await loadRecentBatches();
    await loadPreview();
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
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      content: 'max-w-2xl rounded-lg shadow-lg',
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
      <div class="space-y-5">
        <p class="text-muted text-base">
          Reset student residencies for the selected academic period. This will set active allocations to completed/expired, free up room capacity, and clear student active allocation flags.
        </p>

        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField label="Academic Year">
            <UInput
              v-model="academicYear"
              placeholder="e.g. 2025/2026"
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
            name="i-lucide-loader-2"
            class="size-8 text-primary animate-spin"
          />
        </div>

        <div
          v-else-if="previewData"
          class="space-y-4"
        >
          <div class="gap-3 grid grid-cols-2 sm:grid-cols-4">
            <div class="bg-subtle p-3 border rounded-lg text-center">
              <p class="text-muted text-xs">
                Students Affected
              </p>

              <p class="font-bold text-highlighted text-xl">
                {{ previewData.totalAffectedStudents }}
              </p>
            </div>

            <div class="bg-subtle p-3 border rounded-lg text-center">
              <p class="text-muted text-xs">
                Rooms Affected
              </p>

              <p class="font-bold text-highlighted text-xl">
                {{ previewData.totalAffectedRooms }}
              </p>
            </div>

            <div class="bg-subtle p-3 border rounded-lg text-center">
              <p class="text-muted text-xs">
                Rooms Freed
              </p>

              <p class="font-bold text-success text-xl">
                {{ previewData.roomsFreedCount }}
              </p>
            </div>

            <div class="bg-subtle p-3 border rounded-lg text-center">
              <p class="text-muted text-xs">
                Partially Vacated
              </p>

              <p class="font-bold text-warning text-xl">
                {{ previewData.roomsPartiallyVacatedCount }}
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

            <div class="border rounded-md divide-y max-h-36 overflow-y-auto text-xs">
              <div
                v-for="item in previewData.sampleAllocations"
                :key="item.allocationId"
                class="flex justify-between items-center p-2"
              >
                <span>{{ item.studentName }} ({{ item.studentEmail }})</span>

                <UBadge
                  variant="subtle"
                  size="xs"
                >
                  Room {{ item.roomNumber }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="recentBatches.length"
          class="space-y-2 pt-4 border-t"
        >
          <p class="font-semibold text-muted text-xs">
            Recent Resets (Available for 48h Undo):
          </p>

          <div class="space-y-2">
            <div
              v-for="batch in recentBatches"
              :key="batch.id"
              class="flex justify-between items-center bg-subtle p-2.5 border rounded-md text-xs"
            >
              <div>
                <p class="font-medium">
                  {{ batch.triggerSource.toUpperCase() }} Reset by {{ batch.triggeredByName || "System Cron" }}
                </p>

                <p class="text-muted">
                  {{ new Date(batch.createdAt).toLocaleString() }}
                </p>
              </div>

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
</template>
