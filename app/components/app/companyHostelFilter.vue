<script setup lang="ts">
const filterStore = useCompanyHostelFilterStore();
const {
  companyId,
  hostelId,
  companyOptions,
  hostelOptions,
  showCompanyFilter,
  showHostelFilter,
  companiesStatus,
} = storeToRefs(filterStore);
</script>

<template>
  <div class="place-items-center gap-6 grid grid-cols-2 w-full">
    <UFormField
      v-if="showCompanyFilter"
      required
      label="Company"
      name="companyId"
      class="col-span-1 w-full"
    >
      <USelectMenu
        v-model="companyId"
        :items="companyOptions"
        :loading="companiesStatus === 'pending'"
        placeholder="Select Company"
        value-key="value"
        class="w-full"
        clear
      />
    </UFormField>

    <UFormField
      v-if="showHostelFilter"
      label="Hostel"
      name="hostelId"
      class="col-span-1 w-full"
    >
      <USelectMenu
        v-model="hostelId"
        :items="hostelOptions"
        placeholder="Select Hostel"
        value-key="value"
        class="w-full"
        clear
      />
    </UFormField>
  </div>
</template>
