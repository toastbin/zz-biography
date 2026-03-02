import { ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useAdminApi } from '@/composables/useAdminApi'
import type { StoryManifest, NpcDefinition } from '@/types/story'

export interface NpcRow {
  id: string
  name: string
  initialAffinity: number
  portraits: string[]
}

export function useNpcEditor(
  manifest: Ref<StoryManifest | null>,
  api: ReturnType<typeof useAdminApi>,
  charId: ComputedRef<string>,
) {
  const npcRows = ref<NpcRow[]>([])
  const npcSaving = ref(false)
  const npcError = ref('')
  const npcSuccess = ref(false)

  function initNpcs() {
    npcRows.value = (manifest.value?.npcs ?? []).map(n => ({ ...n, portraits: n.portraits ?? [] }))
  }

  function addNpc() {
    npcRows.value.push({ id: '', name: '', initialAffinity: 0, portraits: [] })
  }

  function removeNpc(i: number) {
    npcRows.value.splice(i, 1)
  }

  function addNpcPortrait(npcIdx: number, key: string) {
    const row = npcRows.value[npcIdx]
    if (!row) return
    const trimmed = key.trim()
    if (trimmed && !row.portraits.includes(trimmed)) {
      row.portraits.push(trimmed)
    }
  }

  function removeNpcPortrait(npcIdx: number, portIdx: number) {
    const row = npcRows.value[npcIdx]
    if (!row) return
    row.portraits.splice(portIdx, 1)
  }

  async function saveNpcs() {
    if (!manifest.value) return

    // Validate
    for (const row of npcRows.value) {
      if (!row.id.trim()) {
        npcError.value = 'NPC id 不能为空'
        return
      }
    }
    const ids = npcRows.value.map(r => r.id.trim())
    if (new Set(ids).size !== ids.length) {
      npcError.value = 'NPC id 不能重复'
      return
    }

    npcSaving.value = true
    npcError.value = ''
    npcSuccess.value = false
    try {
      const npcs: NpcDefinition[] = npcRows.value.map(r => ({
        id: r.id.trim(),
        name: r.name.trim(),
        initialAffinity: Number(r.initialAffinity) || 0,
        ...(r.portraits.length ? { portraits: r.portraits } : {}),
      }))
      const updated = await api.updateManifest(charId.value, { npcs })
      manifest.value = updated
      initNpcs()
      npcSuccess.value = true
      setTimeout(() => (npcSuccess.value = false), 2000)
    } catch (e) {
      npcError.value = String(e)
    } finally {
      npcSaving.value = false
    }
  }

  return { npcRows, npcSaving, npcError, npcSuccess, initNpcs, addNpc, removeNpc, saveNpcs, addNpcPortrait, removeNpcPortrait }
}
