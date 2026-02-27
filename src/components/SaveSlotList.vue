<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSaves } from '@/composables/useSaves'
import type { SaveSlot } from '@/types/save'

const emit = defineEmits<{
  load: [slot: SaveSlot]
  close: []
}>()

const { loadAll } = useSaves()
const slots = ref<(SaveSlot | null)[]>([])

onMounted(() => {
  slots.value = loadAll()
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="ssl-overlay" @click.self="emit('close')">
    <div class="ssl-panel">
      <div class="ssl-header">
        <span class="ssl-title">读取存档</span>
        <button class="ssl-close" @click="emit('close')">✕</button>
      </div>
      <div class="ssl-scroll">
        <template v-for="(slot, i) in slots" :key="i">
          <button v-if="slot" class="slot-row filled" @click="emit('load', slot)">
            <span class="slot-index">{{ i + 1 }}</span>
            <span class="slot-info">
              <span class="slot-name">{{ slot.name }}</span>
              <span class="slot-date">{{ formatDate(slot.savedAt) }}</span>
            </span>
            <span class="slot-cta">加载 →</span>
          </button>
        </template>
        <div v-if="slots.every((s) => !s)" class="ssl-empty">暂无存档</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ssl-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.ssl-panel {
  background: rgba(10, 10, 20, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  width: min(500px, 90vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.ssl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.ssl-title {
  color: #f0c040;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.ssl-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  transition: color 0.2s;
}

.ssl-close:hover {
  color: #f0c040;
}

.ssl-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0;
}

.ssl-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.9rem;
  padding: 2rem;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.slot-row:hover {
  background: rgba(240, 192, 64, 0.1);
}

.slot-index {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.35);
  width: 1.5rem;
  flex-shrink: 0;
  text-align: right;
}

.slot-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.slot-name {
  font-size: 0.92rem;
  color: #f0f0f0;
}

.slot-date {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.slot-cta {
  font-size: 0.8rem;
  color: #f0c040;
  flex-shrink: 0;
}
</style>
