<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CharacterCard from '@/components/CharacterCard.vue'
import { characters } from '@/data/characters'
import type { Character } from '@/types/character'

const router = useRouter()
const selectedCharacter = ref<Character | null>(null)

function selectCharacter(character: Character) {
  selectedCharacter.value = character
}

function confirmSelection() {
  if (selectedCharacter.value) {
    router.push(`/story/${selectedCharacter.value.id}`)
  }
}
</script>

<template>
  <div class="character-select">
    <header class="header">
      <h1 class="title">选择你的角色</h1>
      <p class="subtitle">开启属于你的冒险之旅</p>
    </header>

    <div class="character-grid">
      <CharacterCard
        v-for="character in characters"
        :key="character.id"
        :character="character"
        :selected="selectedCharacter?.id === character.id"
        @select="selectCharacter"
      />
    </div>

    <div class="actions">
      <button class="confirm-button" :disabled="!selectedCharacter" @click="confirmSelection">
        确认选择
      </button>
    </div>
  </div>
</template>

<style scoped>
.character-select {
  min-height: 100vh;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--spacing-lg);
  width: 100%;
  max-width: 900px;
  margin-bottom: var(--spacing-xl);
}

.actions {
  margin-top: auto;
  padding-top: var(--spacing-lg);
}

.confirm-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: 1rem;
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    opacity var(--transition-fast);
}

.confirm-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.confirm-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
