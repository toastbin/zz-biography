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
  const mfStartSceneId = ref('')
  const mfSaving = ref(false)
  const mfError = ref('')
  const mfSuccess = ref(false)

  function initManifestForm() {
    if (!manifest.value) return
    mfDefaultSpeaker.value = manifest.value.defaultSpeaker ?? ''
    mfStartSceneId.value = manifest.value.startSceneId ?? ''
  }

  async function saveManifestCore() {
    if (!manifest.value) return
    mfSaving.value = true
    mfError.value = ''
    mfSuccess.value = false
    try {
      const updated = await api.updateManifest(characterId.value, {
        defaultSpeaker: mfDefaultSpeaker.value || undefined,
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

  return { mfDefaultSpeaker, mfStartSceneId, mfSaving, mfError, mfSuccess, initManifestForm, saveManifestCore }
}
