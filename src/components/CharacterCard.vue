<script setup lang="ts">
import type { Character } from '@/types/character'

defineProps<{
  character: Character
  selected: boolean
}>()

defineEmits<{
  select: [character: Character]
}>()
</script>

<template>
  <div class="character-card" :class="{ selected }" @click="$emit('select', character)">
    <div class="avatar">{{ character.avatar }}</div>
    <h3 class="name">{{ character.name }}</h3>
    <p class="description">{{ character.description }}</p>
  </div>
</template>

<style scoped>
.character-card {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.character-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.character-card.selected {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
  transform: scale(1.02);
}

.avatar {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
