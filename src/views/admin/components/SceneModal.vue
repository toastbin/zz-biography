<script setup lang="ts">
import { watch, computed } from 'vue'
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
  knownNpcs?: Array<{ id: string; name: string }>
  saving?: boolean
  saveError?: string
  suggestedId?: string
  defaultSpeaker?: string
  speakerPortraitMap?: Record<string, string[]>
}>()

const emit = defineEmits<{
  save: [scene: RawStoryScene]
  cancel: []
  'open-quick-create': [choiceIdx: number]
}>()

const form = useSceneForm()

const portraitHint = computed(() => {
  const s = form.fSpeaker.value?.trim()
  const def = props.defaultSpeaker?.trim() ?? ''
  if (!s || s === def) return '← 左侧'
  return '→ 右侧'
})

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

watch(
  () => form.fSpeaker.value,
  () => {
    form.fPortrait.value = ''
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
          title
          <input
            v-model="form.fTitle.value"
            class="field-input"
            placeholder="场景小标题（可选）"
          />
        </label>

        <div class="field-group">
          <label class="field-label-text">background</label>
          <div class="asset-picker">
            <button
              class="asset-tag"
              :class="{ selected: !form.fBackground.value }"
              @click="form.fBackground.value = ''"
            >（无）</button>
            <button
              v-for="key in knownBgKeys"
              :key="key"
              class="asset-tag"
              :class="{ selected: form.fBackground.value === key }"
              @click="form.fBackground.value = key"
            >{{ key }}</button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label-text">portrait</label>
          <div class="asset-picker">
            <button
              class="asset-tag"
              :class="{ selected: !form.fPortrait.value }"
              @click="form.fPortrait.value = ''"
            >（无）</button>
            <button
              v-for="key in (speakerPortraitMap?.[form.fSpeaker.value ?? ''] ?? knownPortraitKeys)"
              :key="key"
              class="asset-tag"
              :class="{ selected: form.fPortrait.value === key }"
              @click="form.fPortrait.value = key"
            >{{ key }}</button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label-text">speaker <span class="portrait-hint">{{ portraitHint }}</span></label>
          <div class="asset-picker">
            <button
              class="asset-tag"
              :class="{ selected: !form.fSpeaker.value }"
              @click="form.fSpeaker.value = ''"
            >（默认）</button>
            <button
              v-if="defaultSpeaker"
              class="asset-tag"
              :class="{ selected: form.fSpeaker.value === defaultSpeaker }"
              @click="form.fSpeaker.value = defaultSpeaker"
            >{{ defaultSpeaker }}</button>
            <button
              v-for="npc in knownNpcs"
              :key="npc.id"
              class="asset-tag"
              :class="{ selected: form.fSpeaker.value === npc.name }"
              @click="form.fSpeaker.value = npc.name"
            >{{ npc.name }}</button>
          </div>
        </div>

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
          <div v-for="(ch, i) in form.fChoices.value" :key="i" class="choice-block">
            <div class="choice-row">
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
            <div v-if="knownNpcs && knownNpcs.length" class="affinity-row">
              <span class="affinity-label">效果</span>
              <select v-model="ch.affinityEffectNpcId" class="field-select affinity-npc">
                <option value="">— NPC —</option>
                <option v-for="npc in knownNpcs" :key="npc.id" :value="npc.id">{{ npc.name }}</option>
              </select>
              <input v-model="ch.affinityEffectDelta" class="field-input affinity-delta" placeholder="±n" type="number" />
              <span class="affinity-label">解锁</span>
              <select v-model="ch.affinityCondNpcId" class="field-select affinity-npc">
                <option value="">— NPC —</option>
                <option v-for="npc in knownNpcs" :key="npc.id" :value="npc.id">{{ npc.name }}</option>
              </select>
              <span class="affinity-ge">≥</span>
              <input v-model="ch.affinityCondMinValue" class="field-input affinity-min" placeholder="0" type="number" />
            </div>
          </div>
          <button class="btn sm" @click="() => { form.addChoice(); emit('open-quick-create', form.fChoices.value.length - 1) }">+ Add Choice</button>
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
  width: 700px;
  max-width: calc(100vw - 2rem);
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
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

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.portrait-hint {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  margin-left: 0.4rem;
}

.asset-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}

.asset-tag {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  font-family: inherit;
}

.asset-tag:hover {
  border-color: #f0c040;
  color: #f0c040;
}

.asset-tag.selected {
  background: rgba(240, 192, 64, 0.15);
  border-color: #f0c040;
  color: #f0c040;
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

.choice-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.4rem;
}

.choice-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.affinity-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-left: 0.2rem;
}

.affinity-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  flex-shrink: 0;
}

.affinity-ge {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.affinity-npc {
  flex: 1;
  font-size: 0.8rem;
  min-width: 0;
}

.affinity-delta,
.affinity-min {
  width: 4.5rem;
  flex-shrink: 0;
  font-size: 0.8rem;
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
