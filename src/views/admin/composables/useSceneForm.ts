import { ref } from 'vue'
import type { SceneEntry } from '@/composables/useAdminApi'
import type { RawStoryScene } from '@/types/story'

export function useSceneForm() {
  const fId = ref('')
  const fBackground = ref('')
  const fPortrait = ref('')
  const fSpeaker = ref('')
  const fText = ref('')
  const fType = ref<'linear' | 'choice' | 'terminal'>('linear')
  const fNext = ref('')
  const fChoices = ref<Array<{ text: string; nextSceneId: string; condition: string }>>([])
  const fError = ref('')
  const fSaving = ref(false)

  function initialize(entry?: SceneEntry | null) {
    if (!entry) {
      fId.value = ''
      fBackground.value = ''
      fPortrait.value = ''
      fSpeaker.value = ''
      fText.value = ''
      fType.value = 'linear'
      fNext.value = ''
      fChoices.value = []
    } else {
      const s = entry.scene
      fId.value = s.id
      fBackground.value = s.background ?? ''
      fPortrait.value = s.portrait ?? ''
      fSpeaker.value = s.speaker ?? ''
      fText.value = s.text ?? ''
      fType.value = entry.sceneType
      fNext.value = s.next ?? ''
      fChoices.value = (s.choices ?? []).map(c => ({
        text: c.text,
        nextSceneId: c.nextSceneId,
        condition: c.condition ?? '',
      }))
    }
    fError.value = ''
  }

  function build(): RawStoryScene {
    const scene: RawStoryScene = {
      id: fId.value,
      background: fBackground.value,
      text: fText.value,
    }
    if (fPortrait.value) scene.portrait = fPortrait.value
    if (fSpeaker.value) scene.speaker = fSpeaker.value
    if (fType.value === 'linear') {
      scene.next = fNext.value
    } else if (fType.value === 'choice') {
      scene.choices = fChoices.value
        .filter(c => c.text || c.nextSceneId)
        .map(c => ({
          text: c.text,
          nextSceneId: c.nextSceneId,
          ...(c.condition ? { condition: c.condition } : {}),
        }))
    }
    return scene
  }

  function validate(mode: 'create' | 'edit', existingIds: string[]): string | null {
    const id = fId.value.trim()
    if (mode === 'create') {
      if (!id || !/^[\w-]+$/.test(id)) {
        return '场景 ID 只允许字母、数字、下划线、连字符'
      }
      if (existingIds.includes(id)) {
        return '该 ID 已存在'
      }
    }
    if (fType.value === 'choice') {
      const valid = fChoices.value.filter(c => c.text.trim() && c.nextSceneId)
      if (valid.length === 0) {
        return 'Choice 类型至少需要一个完整的选项（文本 + 目标场景）'
      }
    }
    return null
  }

  function reset() {
    initialize()
  }

  function addChoice() {
    fChoices.value.push({ text: '', nextSceneId: '', condition: '' })
  }

  function removeChoice(i: number) {
    fChoices.value.splice(i, 1)
  }

  function linkChoiceScene(idx: number, sceneId: string) {
    const choice = fChoices.value[idx]
    if (idx >= 0 && choice) {
      choice.nextSceneId = sceneId
    }
  }

  return {
    fId,
    fBackground,
    fPortrait,
    fSpeaker,
    fText,
    fType,
    fNext,
    fChoices,
    fError,
    fSaving,
    initialize,
    build,
    validate,
    reset,
    addChoice,
    removeChoice,
    linkChoiceScene,
  }
}
