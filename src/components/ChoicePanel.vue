<script setup lang="ts">
import type { StoryChoice } from '@/types/story'

interface ChoiceWithLock extends StoryChoice {
  locked?: boolean
  lockedHint?: string
}

defineProps<{
  choices: ChoiceWithLock[]
}>()

defineEmits<{
  choose: [choice: ChoiceWithLock, index: number]
}>()
</script>

<template>
  <div class="choice-panel">
    <button
      v-for="(choice, index) in choices"
      :key="choice.nextSceneId"
      class="choice-button"
      :class="{ locked: choice.locked }"
      :disabled="choice.locked"
      @click="!choice.locked && $emit('choose', choice, index)"
    >
      {{ choice.text }}
      <span v-if="choice.locked && choice.lockedHint" class="lock-hint">
        🔒 {{ choice.lockedHint }}
      </span>
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

.choice-button:hover:not(.locked) {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
  color: #f0c040;
}

.choice-button.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.lock-hint {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 0.25rem;
}
</style>
