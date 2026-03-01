<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminApi, type CharacterSummary } from '@/composables/useAdminApi'

const props = defineProps<{
  open: boolean
  api: ReturnType<typeof useAdminApi>
}>()

const emit = defineEmits<{
  created: [summary: CharacterSummary]
  cancel: []
}>()

const newCharId = ref('')
const newCharError = ref('')
const creating = ref(false)

watch(
  () => props.open,
  open => {
    if (open) {
      newCharId.value = ''
      newCharError.value = ''
    }
  },
)

async function confirmCreate() {
  const id = newCharId.value.trim()
  if (!id || !/^[\w-]+$/.test(id)) {
    newCharError.value = '请输入有效的 ID（字母、数字、连字符）'
    return
  }
  creating.value = true
  newCharError.value = ''
  try {
    const summary = await props.api.createCharacter(id)
    emit('created', summary)
    newCharId.value = ''
  } catch (e) {
    newCharError.value = String(e)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal">
      <h2 class="modal-title">新建角色</h2>
      <label class="field-label">
        角色 ID
        <input
          v-model="newCharId"
          class="field-input"
          placeholder="e.g. scholar"
          @keyup.enter="confirmCreate"
          autofocus
        />
      </label>
      <p v-if="newCharError" class="field-error">{{ newCharError }}</p>
      <p class="modal-note">
        注意：创建后需手动在 <code>src/data/characters.ts</code> 中添加角色信息，才能在角色选择界面中显示。
      </p>
      <div class="modal-actions">
        <button class="btn" @click="emit('cancel')">取消</button>
        <button class="btn primary" :disabled="creating" @click="confirmCreate">
          {{ creating ? '创建中…' : '确认创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.modal {
  background: rgba(12, 14, 24, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 2rem;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f0c040;
  margin: 0;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.field-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #f0f0f0;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.field-input:focus {
  border-color: rgba(240, 192, 64, 0.6);
}

.field-error {
  color: #e06c75;
  font-size: 0.82rem;
  margin: -0.25rem 0 0;
}

.modal-note {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.5;
  margin: 0;
}
.modal-note code {
  font-family: monospace;
  color: rgba(240, 192, 64, 0.7);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 0.55rem 1.25rem;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  font-family: inherit;
}
.btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.1);
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}
.btn.primary {
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}
.btn.primary:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
