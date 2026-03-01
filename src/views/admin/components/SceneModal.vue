<script setup lang="ts">
import { watch } from 'vue'
import type { SceneEntry } from '@/composables/useAdminApi'
import type { RawStoryScene } from '@/types/story'
import { useSceneForm } from '../composables/useSceneForm'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  entry?: SceneEntry
  allSceneIds: string[]
  knownBgKeys: string[]
  knownPortraitKeys: string[]
  saving?: boolean
  saveError?: string
  suggestedId?: string
}>()

const emit = defineEmits<{
  save: [scene: RawStoryScene]
  cancel: []
  'open-quick-create': [choiceIdx: number]
}>()

const form = useSceneForm()

watch(
  () => props.open,
  open => {
    if (open) {
      if (props.mode === 'edit' && props.entry) {
        form.initialize(props.entry)
      } else {
        form.initialize(null)
        if (props.suggestedId) {
          form.fId.value = props.suggestedId
        }
      }
    }
  },
)

function handleSave() {
  const error = form.validate(props.mode, props.allSceneIds)
  if (error) {
    form.fError.value = error
    return
  }
  const scene = form.build()
  emit('save', scene)
}

defineExpose({
  linkChoiceScene: form.linkChoiceScene,
})
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal scene-modal">
      <h2 class="modal-title">{{ mode === 'create' ? '新建场景' : '编辑场景' }}</h2>

      <div class="modal-fields">
        <label class="field-label">
          id
          <input
            v-model="form.fId.value"
            class="field-input"
            placeholder="scene_id"
            :disabled="mode === 'edit'"
          />
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
          <input v-model="form.fSpeaker.value" class="field-input" placeholder="（可为空，使用 defaultSpeaker）" />
        </label>

        <label class="field-label">
          text
          <textarea v-model="form.fText.value" class="field-input" rows="4" placeholder="场景台词…" />
        </label>

        <!-- Scene type radio -->
        <fieldset class="type-radio">
          <legend class="field-label-text">场景类型</legend>
          <label class="radio-label">
            <input type="radio" v-model="form.fType.value" value="linear" /> Linear
          </label>
          <label class="radio-label">
            <input type="radio" v-model="form.fType.value" value="choice" /> Choice
          </label>
          <label class="radio-label">
            <input type="radio" v-model="form.fType.value" value="terminal" /> Terminal
          </label>
        </fieldset>

        <!-- next (linear) -->
        <label v-if="form.fType.value === 'linear'" class="field-label">
          next
          <select v-model="form.fNext.value" class="field-select">
            <option value="">（未设置）</option>
            <option v-for="sid in allSceneIds" :key="sid" :value="sid">{{ sid }}</option>
          </select>
        </label>

        <!-- choices (choice) -->
        <div v-if="form.fType.value === 'choice'" class="choices-editor">
          <p class="field-label-text">Choices</p>
          <div v-for="(ch, i) in form.fChoices.value" :key="i" class="choice-row">
            <input v-model="ch.text" class="field-input choice-text" placeholder="选项文本" />
            <span class="arrow-cell">→</span>
            <select v-model="ch.nextSceneId" class="field-select choice-next">
              <option value="">—</option>
              <option v-for="sid in allSceneIds" :key="sid" :value="sid">{{ sid }}</option>
            </select>
            <button class="icon-btn choice-quick-add" @click.prevent="emit('open-quick-create', i)" title="新建并链接场景">＋</button>
            <input v-model="ch.condition" class="field-input choice-condition" placeholder="条件（可选）" />
            <button class="icon-btn" @click="form.removeChoice(i)">✕</button>
          </div>
          <button class="btn sm" @click="form.addChoice()">+ Add Choice</button>
        </div>
      </div>

      <p v-if="form.fError.value || saveError" class="field-error">
        {{ form.fError.value || saveError }}
      </p>

      <div class="modal-actions">
        <button class="btn" @click="emit('cancel')">取消</button>
        <button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '保存' }}
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

.field-label-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.field-input,
.field-select {
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
.field-input:focus,
.field-select:focus {
  border-color: rgba(240, 192, 64, 0.55);
}
.field-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.field-error {
  color: #e06c75;
  font-size: 0.8rem;
  margin: 0;
}

/* Type radio */
.type-radio {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  gap: 1.25rem;
  align-items: center;
}
.type-radio legend {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 0 0.25rem;
}

.radio-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

/* Choices editor */
.choices-editor {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.choice-text {
  flex: 1.8;
}
.choice-next {
  flex: 1;
}
.choice-condition {
  flex: 1;
  font-size: 0.8rem;
}

.arrow-cell {
  color: rgba(255, 255, 255, 0.3);
  padding: 0 4px;
  font-size: 0.85rem;
}

.choice-quick-add {
  color: rgba(97, 175, 239, 0.7);
  font-size: 1rem;
  padding: 0 2px;
  flex-shrink: 0;
}
.choice-quick-add:hover {
  color: #61afef;
}

/* Buttons */
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
.btn.sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
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

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.icon-btn:hover {
  color: #e06c75;
}
</style>
