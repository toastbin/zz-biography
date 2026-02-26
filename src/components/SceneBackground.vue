<script setup lang="ts">
defineProps<{
  src: string
}>()
</script>

<template>
  <Transition name="bg-fade">
    <img :key="src" :src="src" class="scene-background" alt="" />
  </Transition>
</template>

<style scoped>
.scene-background {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.bg-fade-enter-active,
.bg-fade-leave-active {
  transition: opacity 0.5s ease;
}

.bg-fade-enter-from,
.bg-fade-leave-to {
  opacity: 0;
}
</style>
