import { ref, onMounted } from 'vue'
import { useAdminApi, type CharacterSummary } from '@/composables/useAdminApi'

export function useCharacterList(api: ReturnType<typeof useAdminApi>) {
  const characters = ref<CharacterSummary[]>([])
  const loading = ref(true)
  const error = ref('')

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      characters.value = await api.listCharacters()
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(refresh)

  return { characters, loading, error, refresh }
}
