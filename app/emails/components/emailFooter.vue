<script setup lang="ts">
interface Props {
  hostelName?: string;
}

const { hostelName = "Kayanest" } = defineProps<Props>();

const year = new Date().getFullYear();
</script>

<template>
  <ESection style="border-top:1px solid #e9f4f3;padding:14px 22px;background-color:#fafafa;">
    <EText style="margin:0;font-size:11px;color:#6b7280;">
      If you didn't request this, you can ignore this email.
    </EText>

    <EText style="margin:6px 0 0;font-size:10px;color:#9ca3af;">
      © {{ year }} {{ hostelName || 'Hostel' }}
    </EText>
  </ESection>
</template>
