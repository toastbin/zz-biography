<script setup lang="ts">
import type { StoryChoice } from '@/types/story'

defineProps<{
  choices: StoryChoice[]
}>()

defineEmits<{
  choose: [choice: StoryChoice]
}>()
</script>

<template>
  <div class="choice-panel">
    <button
      v-for="choice in choices"
      :key="choice.nextSceneId"
      class="choice-button"
      @click="$emit('choose', choice)"
    >
      {{ choice.text }}
    </button>
  </div>
</template>

<style scoped>
.choice-panel {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 4;
  width: min(480px, 80%);
}

.choice-button {
  background: rgba(10, 10, 20, 0.88);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  text-align: center;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.choice-button:hover {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
  color: #f0c040;
}
</style>
