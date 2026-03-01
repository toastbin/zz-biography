import { ref } from 'vue'
import type { Ref } from 'vue'
import { useAdminApi } from '@/composables/useAdminApi'
import type { StoryManifest, StoryAssets } from '@/types/story'

export interface AliasRow {
  key: string
  value: string
}

export function useAliasManager(
  manifest: Ref<StoryManifest | null>,
  api: ReturnType<typeof useAdminApi>,
  charId: Ref<string>,
) {
  const bgAliases = ref<AliasRow[]>([])
  const portraitAliases = ref<AliasRow[]>([])
  const bgSaving = ref(false)
  const portraitSaving = ref(false)
  const bgError = ref('')
  const portraitError = ref('')
  const bgSuccess = ref(false)
  const portraitSuccess = ref(false)

  function aliasesToRows(record: Record<string, string> | undefined): AliasRow[] {
    return Object.entries(record ?? {}).map(([key, value]) => ({ key, value }))
  }

  function rowsToRecord(rows: AliasRow[]): Record<string, string> {
    const out: Record<string, string> = {}
    for (const { key, value } of rows) {
      if (key.trim()) out[key.trim()] = value
    }
    return out
  }

  function initBgAliases() {
    bgAliases.value = aliasesToRows(manifest.value?.assets?.bg)
  }

  function initPortraitAliases() {
    portraitAliases.value = aliasesToRows(manifest.value?.assets?.portrait)
  }

  async function saveBg() {
    if (!manifest.value) return
    bgSaving.value = true
    bgError.value = ''
    bgSuccess.value = false
    try {
      const assets: StoryAssets = {
        ...manifest.value.assets,
        bg: rowsToRecord(bgAliases.value),
      }
      const updated = await api.updateManifest(charId.value, { assets })
      manifest.value = updated
      initBgAliases()
      bgSuccess.value = true
      setTimeout(() => (bgSuccess.value = false), 2000)
    } catch (e) {
      bgError.value = String(e)
    } finally {
      bgSaving.value = false
    }
  }

  async function savePortraits() {
    if (!manifest.value) return
    portraitSaving.value = true
    portraitError.value = ''
    portraitSuccess.value = false
    try {
      const assets: StoryAssets = {
        ...manifest.value.assets,
        portrait: rowsToRecord(portraitAliases.value),
      }
      const updated = await api.updateManifest(charId.value, { assets })
      manifest.value = updated
      initPortraitAliases()
      portraitSuccess.value = true
      setTimeout(() => (portraitSuccess.value = false), 2000)
    } catch (e) {
      portraitError.value = String(e)
    } finally {
      portraitSaving.value = false
    }
  }

  return {
    bgAliases,
    portraitAliases,
    bgSaving,
    portraitSaving,
    bgError,
    portraitError,
    bgSuccess,
    portraitSuccess,
    initBgAliases,
    initPortraitAliases,
    saveBg,
    savePortraits,
  }
}
