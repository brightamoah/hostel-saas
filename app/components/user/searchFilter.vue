<script setup lang="ts">
const {
  statusFilterOptions,
  roleFilterOptions,
  hostelFilterOptions,
} = defineProps<{
  statusFilterOptions: FilterOption[];
  roleFilterOptions: FilterOption[];
  hostelFilterOptions: FilterOption[];
}>();

const { isPlatformAdminOrOwner } = usePortalUserSession();

const globalFilterModel = defineModel<string>();
const statusFilterModel = defineModel<string>("statusFilter");
const roleFilterModel = defineModel<string>("roleFilter");
const hostelFilterModel = defineModel<string>("hostelFilter");
</script>

<template>
  <div class="md:flex md:justify-between md:items-center md:gap-4 space-y-4 md:space-y-0 mt-10">
    <UInput
      v-model="globalFilterModel"
      class="w-full md:max-w-sm"
      icon="i-lucide-search"
      placeholder="Search users..."
      size="xl"
    />

    <div class="flex sm:flex-row flex-col gap-3 md:gap-4">
      <USelect
        v-model="statusFilterModel"
        arrow
        placeholder="Filter by Status"
        class="w-full sm:min-w-40 text-center cursor-pointer"
        size="xl"
        :items="statusFilterOptions"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
          item: 'cursor-pointer',
        }"
      />

      <USelect
        v-model="roleFilterModel"
        arrow
        placeholder="Filter by Role"
        class="w-full sm:min-w-40 text-center cursor-pointer"
        size="xl"
        :items="roleFilterOptions"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
          item: 'cursor-pointer',
        }"
      />

      <USelectMenu
        v-if="isPlatformAdminOrOwner"
        v-model="hostelFilterModel"
        arrow
        clear
        placeholder="Filter by Hostel"
        class="w-full sm:min-w-40 text-center cursor-pointer"
        size="xl"
        value-key="value"
        :items="hostelFilterOptions"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
          item: 'cursor-pointer',
        }"
      />
    </div>

    <div class="flex sm:flex-row flex-col gap-3 md:gap-4">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>

</style>
