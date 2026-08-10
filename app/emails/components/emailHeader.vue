<script setup lang="ts">
interface Props {
  hostelName?: string;
}

const { hostelName = "Kayanest" } = defineProps<Props>();

const style = {
  section: "padding:14px 20px;",
  text: "margin:0;font-size:16px;font-weight:600;color:#3d8582;letter-spacing:0.05em;",
};
</script>

<template>
  <ESection :style="style.section">
    <EText :style="style.text">
      {{ (hostelName || 'Hostel').toUpperCase() }}
    </EText>
  </ESection>
</template>
