<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSaves } from '@/composables/useSaves'
import SaveSlotList from '@/components/SaveSlotList.vue'
import type { SaveSlot } from '@/types/save'

const router = useRouter()
const { hasAnySave } = useSaves()

const hasSaves = ref(false)
const showLoad = ref(false)

onMounted(() => {
  hasSaves.value = hasAnySave()
})

function startNew() {
  router.push('/select')
}

function loadSave(slot: SaveSlot) {
  router.push({ path: `/story/${slot.characterId}`, query: { slot: slot.slotIndex.toString() } })
}
</script>

<template>
  <div class="home">
    <div class="home-content">
      <h1 class="home-title">zz传记</h1>
      <p class="home-subtitle">每一个选择，都将留下痕迹</p>

      <div class="home-actions">
        <button class="home-btn primary" @click="startNew">新的开始</button>
        <button class="home-btn" :disabled="!hasSaves" @click="showLoad = true">读取存档</button>
      </div>
    </div>

    <SaveSlotList v-if="showLoad" @load="loadSave" @close="showLoad = false" />
  </div>
</template>

<style scoped>
.home {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, #0d1a2e 0%, #06080f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.home-title {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 700;
  color: #f0c040;
  letter-spacing: 0.3em;
  text-shadow: 0 0 40px rgba(240, 192, 64, 0.35);
}

.home-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.08em;
  margin-top: -0.5rem;
}

.home-actions {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
  width: 220px;
}

.home-btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.home-btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.15);
  border-color: #f0c040;
  color: #f0c040;
}

.home-btn.primary {
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}

.home-btn.primary:hover {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
}

.home-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
