<script setup lang="ts">
defineProps<{
  src: string | null
}>()
</script>

<template>
  <Transition name="portrait-fade">
    <img v-if="src" :key="src" :src="src" class="character-portrait" alt="character portrait" />
  </Transition>
</template>

<style scoped>
.character-portrait {
  position: absolute;
  bottom: 28%;
  left: 2rem;
  height: 45%;
  object-fit: contain;
  z-index: 2;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.portrait-fade-enter-active,
.portrait-fade-leave-active {
  transition: opacity 0.3s ease;
}

.portrait-fade-enter-from,
.portrait-fade-leave-to {
  opacity: 0;
}
</style>
