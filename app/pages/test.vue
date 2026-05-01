<script setup lang="ts">
import { log } from "evlog/client";

function triggerError() {
  log.error({ action: "button_click", message: "Nuxt Button Error" });
}
</script>

<template>
  <div>
    <UButton
      id="errorBtn"
      label="Trigger Error"
      size="lg"
      color="error"
      class="cursor-pointer"
      @click="triggerError"
    />
  </div>
</template>
