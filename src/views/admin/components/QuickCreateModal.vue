<script setup lang="ts">
import { computed, watch } from 'vue'
import type { RawStoryScene } from '@/types/story'
import { useSceneForm } from '../composables/useSceneForm'

const props = defineProps<{
  open: boolean
  parentId: string
  choiceIdx: number
  allSceneIds: string[]
  knownBgKeys: string[]
  knownPortraitKeys: string[]
  saving?: boolean
  saveError?: string
}>()

const emit = defineEmits<{
  save: [scene: RawStoryScene, prefix: string]
  cancel: []
}>()

const form = useSceneForm()

const folderPrefix = computed(() => `c${props.choiceIdx + 1}/`)

function suggestId(): string {
  const charPrefix = props.parentId.slice(0, 1)
  let n = 1
  while (props.allSceneIds.includes(`${charPrefix}_${String(n).padStart(3, '0')}`)) {
    n++
  }
  return `${charPrefix}_${String(n).padStart(3, '0')}`
}

watch(
  () => props.open,
  open => {
    if (open) {
      form.initialize(null)
      form.fId.value = suggestId()
    }
  },
)

function handleSave() {
  const id = form.fId.value.trim()
  if (!id || !/^[\w-]+$/.test(id)) {
    form.fError.value = '场景 ID 只允许字母、数字、下划线、连字符'
    return
  }
  if (props.allSceneIds.includes(id)) {
    form.fError.value = '该 ID 已存在'
    return
  }

  const scene: RawStoryScene = {
    id,
    background: form.fBackground.value,
    text: form.fText.value,
  }
  if (form.fPortrait.value) scene.portrait = form.fPortrait.value
  if (form.fSpeaker.value) scene.speaker = form.fSpeaker.value

  emit('save', scene, folderPrefix.value)
}
</script>

<template>
  <div v-if="open" class="modal-overlay qc-overlay" @click.self="emit('cancel')">
    <div class="modal scene-modal qc-modal">
      <h2 class="modal-title">快速新建场景（choice {{ choiceIdx + 1 }}）</h2>
      <div class="modal-fields">
        <label class="field-label">
          id
          <input v-model="form.fId.value" class="field-input" placeholder="scene_id" />
        </label>
        <label class="field-label">
          background
          <input
            v-model="form.fBackground.value"
            class="field-input"
            :placeholder="`已知别名：${knownBgKeys.join(', ') || '—'}`"
          />
        </label>
        <label class="field-label">
          portrait
          <input
            v-model="form.fPortrait.value"
            class="field-input"
            :placeholder="`已知别名：${knownPortraitKeys.join(', ') || '—（可为空）'}`"
          />
        </label>
        <label class="field-label">
          speaker
          <input v-model="form.fSpeaker.value" class="field-input" placeholder="（可为空）" />
        </label>
        <label class="field-label">
          text
          <textarea v-model="form.fText.value" class="field-input" rows="3" placeholder="场景台词…" />
        </label>
      </div>
      <p v-if="form.fError.value || saveError" class="field-error">
        {{ form.fError.value || saveError }}
      </p>
      <div class="modal-actions">
        <button class="btn" @click="emit('cancel')">取消</button>
        <button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '创建并链接' }}
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
  padding: 1rem;
}

.qc-overlay {
  z-index: 40;
}

.scene-modal {
  background: rgba(12, 14, 24, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1.75rem;
  width: 540px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qc-modal {
  width: 420px;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f0c040;
  margin: 0;
}

.modal-fields {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.field-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #f0f0f0;
  padding: 0.4rem 0.6rem;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  resize: vertical;
}
.field-input:focus {
  border-color: rgba(240, 192, 64, 0.55);
}

.field-error {
  color: #e06c75;
  font-size: 0.8rem;
  margin: 0;
}

.btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  font-family: inherit;
}
.btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.1);
  border-color: rgba(240, 192, 64, 0.45);
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
