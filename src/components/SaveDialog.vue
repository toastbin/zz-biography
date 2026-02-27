<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MAX_SAVES } from '@/config/saves'
import { useSaves } from '@/composables/useSaves'
import type { SaveSlot } from '@/types/save'

const props = defineProps<{
  characterId: string
  visitedPath: string[]
  choicesTaken: Record<string, number>
  defaultName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { loadAll, save } = useSaves()
const slots = ref<(SaveSlot | null)[]>([])
const selectedIndex = ref<number | null>(null)
const editingName = ref('')

onMounted(() => {
  slots.value = loadAll()
})

function selectSlot(i: number) {
  selectedIndex.value = i
  editingName.value = slots.value[i]?.name ?? props.defaultName
}

function cancelSelect() {
  selectedIndex.value = null
}

function confirmSave() {
  if (selectedIndex.value === null) return
  const slot: SaveSlot = {
    slotIndex: selectedIndex.value,
    name: editingName.value.trim() || props.defaultName,
    characterId: props.characterId,
    visitedPath: [...props.visitedPath],
    choicesTaken: { ...props.choicesTaken },
    savedAt: Date.now(),
  }
  save(slot)
  slots.value = loadAll()
  selectedIndex.value = null
  emit('close')
}

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
  <div class="sd-overlay" @click.self="emit('close')">
    <div class="sd-panel">
      <div class="sd-header">
        <span class="sd-title">存档</span>
        <button class="sd-close" @click="emit('close')">✕</button>
      </div>
      <div class="sd-scroll">
        <div v-for="i in MAX_SAVES" :key="i - 1" class="slot-wrap">
          <!-- Expanded: name input + confirm/cancel -->
          <div v-if="selectedIndex === i - 1" class="slot-edit">
            <span class="slot-index">{{ i }}</span>
            <input
              v-model="editingName"
              class="slot-name-input"
              maxlength="30"
              placeholder="存档名称"
              @keydown.enter="confirmSave"
              @keydown.escape="cancelSelect"
            />
            <button class="btn-confirm" @click="confirmSave">保存</button>
            <button class="btn-cancel" @click="cancelSelect">取消</button>
          </div>

          <!-- Collapsed: slot info row -->
          <button v-else class="slot-row" @click="selectSlot(i - 1)">
            <span class="slot-index">{{ i }}</span>
            <span class="slot-info">
              <template v-if="slots[i - 1]">
                <span class="slot-name">{{ slots[i - 1]!.name }}</span>
                <span class="slot-date">{{ formatDate(slots[i - 1]!.savedAt) }}</span>
              </template>
              <span v-else class="slot-empty">——空槽位——</span>
            </span>
            <span class="slot-action">{{ slots[i - 1] ? '覆盖' : '写入' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.sd-panel {
  background: rgba(10, 10, 20, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  width: min(500px, 90vw);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.sd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.sd-title {
  color: #f0c040;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.sd-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  transition: color 0.2s;
}

.sd-close:hover {
  color: #f0c040;
}

.sd-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0;
}

.slot-wrap {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1.25rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.slot-row:hover {
  background: rgba(240, 192, 64, 0.1);
}

.slot-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: rgba(240, 192, 64, 0.08);
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

.slot-empty {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.3);
}

.slot-action {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.slot-name-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(240, 192, 64, 0.5);
  border-radius: 3px;
  color: #f0f0f0;
  font-size: 0.88rem;
  padding: 0.35rem 0.6rem;
  outline: none;
  font-family: inherit;
}

.slot-name-input:focus {
  border-color: #f0c040;
}

.btn-confirm {
  background: rgba(240, 192, 64, 0.2);
  border: 1px solid #f0c040;
  border-radius: 3px;
  color: #f0c040;
  font-size: 0.82rem;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.btn-confirm:hover {
  background: rgba(240, 192, 64, 0.35);
}

.btn-cancel {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}

.btn-cancel:hover {
  color: #f0f0f0;
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
