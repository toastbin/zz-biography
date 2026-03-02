import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { useAdminApi } from '@/composables/useAdminApi'
import type { StoryManifest } from '@/types/story'

export function useManifestForm(
  manifest: Ref<StoryManifest | null>,
  api: ReturnType<typeof useAdminApi>,
  characterId: ComputedRef<string>,
) {
  const mfDefaultSpeaker = ref('')
  const mfDefaultSpeakerPortraits = ref<string[]>([])
  const mfStartSceneId = ref('')
  const mfSaving = ref(false)
  const mfError = ref('')
  const mfSuccess = ref(false)

  function initManifestForm() {
    if (!manifest.value) return
    mfDefaultSpeaker.value = manifest.value.defaultSpeaker ?? ''
    mfDefaultSpeakerPortraits.value = manifest.value.defaultSpeakerPortraits ?? []
    mfStartSceneId.value = manifest.value.startSceneId ?? ''
  }

  function addDefaultSpeakerPortrait(key: string) {
    const trimmed = key.trim()
    if (trimmed && !mfDefaultSpeakerPortraits.value.includes(trimmed)) {
      mfDefaultSpeakerPortraits.value.push(trimmed)
    }
  }

  function removeDefaultSpeakerPortrait(i: number) {
    mfDefaultSpeakerPortraits.value.splice(i, 1)
  }

  async function saveManifestCore() {
    if (!manifest.value) return
    mfSaving.value = true
    mfError.value = ''
    mfSuccess.value = false
    try {
      const arr = mfDefaultSpeakerPortraits.value.filter(Boolean)
      const updated = await api.updateManifest(characterId.value, {
        defaultSpeaker: mfDefaultSpeaker.value || undefined,
        defaultSpeakerPortraits: arr.length ? arr : undefined,
        startSceneId: mfStartSceneId.value,
      })
      manifest.value = updated
      mfSuccess.value = true
      setTimeout(() => (mfSuccess.value = false), 2000)
    } catch (e) {
      mfError.value = String(e)
    } finally {
      mfSaving.value = false
    }
  }

  return {
    mfDefaultSpeaker,
    mfDefaultSpeakerPortraits,
    mfStartSceneId,
    mfSaving,
    mfError,
    mfSuccess,
    initManifestForm,
    saveManifestCore,
    addDefaultSpeakerPortrait,
    removeDefaultSpeakerPortrait,
  }
}
