import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { useAdminApi, SceneEntry } from '@/composables/useAdminApi'
import type { StoryManifest, RawStoryScene } from '@/types/story'

interface SceneModalHandle {
  linkChoiceScene: (idx: number, sceneId: string) => void
}

export function useSceneCrud(
  scenes: Ref<SceneEntry[]>,
  manifest: Ref<StoryManifest | null>,
  api: ReturnType<typeof useAdminApi>,
  characterId: ComputedRef<string>,
  sceneModalRef: Ref<SceneModalHandle | undefined>,
) {
  // ─── scene modal ────────────────────────────────────────────────────────────

  const modalOpen = ref(false)
  const modalMode = ref<'create' | 'edit'>('create')
  const editingEntry = ref<SceneEntry | null>(null)
  const linAfterEntry = ref<SceneEntry | null>(null)
  const suggestedId = ref('')
  const sceneSaving = ref(false)
  const sceneError = ref('')

  function suggestNextId(parentId: string): string {
    const match = parentId.match(/^(.*?)(\d+)$/)
    if (!match || !match[1] || !match[2]) return ''
    const pfx = match[1]
    const num = parseInt(match[2], 10)
    const digits = match[2].length
    let n = num + 1
    while (scenes.value.some(e => e.scene.id === `${pfx}${String(n).padStart(digits, '0')}`)) {
      n++
    }
    return `${pfx}${String(n).padStart(digits, '0')}`
  }

  function openCreate() {
    modalMode.value = 'create'
    editingEntry.value = null
    linAfterEntry.value = null
    suggestedId.value = ''
    sceneError.value = ''
    modalOpen.value = true
  }

  function openEdit(entry: SceneEntry) {
    modalMode.value = 'edit'
    editingEntry.value = entry
    linAfterEntry.value = null
    suggestedId.value = ''
    sceneError.value = ''
    modalOpen.value = true
  }

  function openCreateFromLinear(entry: SceneEntry) {
    linAfterEntry.value = entry
    suggestedId.value = suggestNextId(entry.scene.id)
    modalMode.value = 'create'
    editingEntry.value = null
    sceneError.value = ''
    modalOpen.value = true
  }

  async function onSceneSave(scene: RawStoryScene) {
    sceneSaving.value = true
    sceneError.value = ''
    try {
      if (modalMode.value === 'create') {
        const entry = await api.createScene(characterId.value, scene)
        scenes.value.push(entry)

        if (linAfterEntry.value) {
          const parent = linAfterEntry.value
          const updatedParent: RawStoryScene = { ...parent.scene, next: scene.id }
          const updatedEntry = await api.updateScene(characterId.value, parent.filePath, updatedParent)
          const idx = scenes.value.findIndex(e => e.filePath === parent.filePath)
          if (idx !== -1) scenes.value[idx] = updatedEntry
          linAfterEntry.value = null
        }

        const data = await api.getStory(characterId.value)
        manifest.value = data.manifest
      } else {
        const entry = await api.updateScene(characterId.value, editingEntry.value!.filePath, scene)
        const idx = scenes.value.findIndex(e => e.filePath === editingEntry.value!.filePath)
        if (idx !== -1) scenes.value[idx] = entry
      }
      modalOpen.value = false
    } catch (e) {
      sceneError.value = String(e)
    } finally {
      sceneSaving.value = false
    }
  }

  // ─── quick-create modal ─────────────────────────────────────────────────────

  const showQuickCreate = ref(false)
  const quickCreateChoiceIdx = ref(-1)
  const quickSaving = ref(false)
  const quickError = ref('')

  function handleOpenQuickCreate(choiceIdx: number) {
    quickCreateChoiceIdx.value = choiceIdx
    quickError.value = ''
    showQuickCreate.value = true
  }

  async function onQuickSave(scene: RawStoryScene, prefix: string) {
    quickSaving.value = true
    quickError.value = ''
    try {
      const entry = await api.createScene(characterId.value, scene, prefix || undefined)
      scenes.value.push(entry)
      sceneModalRef.value?.linkChoiceScene(quickCreateChoiceIdx.value, entry.scene.id)
      showQuickCreate.value = false
    } catch (e) {
      quickError.value = String(e)
    } finally {
      quickSaving.value = false
    }
  }

  // ─── normalize names ────────────────────────────────────────────────────────

  const normalizing = ref(false)
  const normalizeMsg = ref('')

  async function doNormalizeNames() {
    if (!confirm('将根据 choice 索引重命名所有场景文件（文件路径变更，场景 ID 不变）。确认继续？')) return
    normalizing.value = true
    normalizeMsg.value = ''
    try {
      const result = await api.normalizeNames(characterId.value)
      const n = result.renamed.length
      normalizeMsg.value = n > 0 ? `已重命名 ${n} 个文件` : '无需重命名'
      const data = await api.getStory(characterId.value)
      manifest.value = data.manifest
      scenes.value = data.scenes
      setTimeout(() => (normalizeMsg.value = ''), 3000)
    } catch (e) {
      normalizeMsg.value = String(e)
    } finally {
      normalizing.value = false
    }
  }

  // ─── delete scene ───────────────────────────────────────────────────────────

  async function deleteScene(entry: SceneEntry) {
    const isStart = entry.scene.id === manifest.value?.startSceneId
    const msg = isStart
      ? `正在删除起始场景「${entry.scene.id}」，请先更新 startSceneId！确定要继续删除吗？`
      : `确定要删除场景「${entry.scene.id}」吗？`
    if (!confirm(msg)) return

    try {
      await api.deleteScene(characterId.value, entry.filePath)
      scenes.value = scenes.value.filter(e => e.filePath !== entry.filePath)
      const data = await api.getStory(characterId.value)
      manifest.value = data.manifest
    } catch (e) {
      alert(String(e))
    }
  }

  return {
    modalOpen, modalMode, editingEntry, suggestedId, sceneSaving, sceneError,
    showQuickCreate, quickCreateChoiceIdx, quickSaving, quickError,
    normalizing, normalizeMsg,
    openCreate, openEdit, openCreateFromLinear, onSceneSave,
    handleOpenQuickCreate, onQuickSave,
    doNormalizeNames, deleteScene,
  }
}
