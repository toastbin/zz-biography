import { ref, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { SceneEntry } from '@/composables/useAdminApi'

export function useSceneSearch(scenes: Ref<SceneEntry[]>) {
  const searchQuery = ref('')
  const showSearch = ref(false)
  const highlightedId = ref<string | null>(null)

  function hideSearchDelayed() {
    setTimeout(() => (showSearch.value = false), 150)
  }

  const searchResults = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return []
    return scenes.value.filter(({ scene: s }) =>
      s.id.toLowerCase().includes(q) ||
      s.title?.toLowerCase().includes(q) ||
      s.text?.toLowerCase().includes(q) ||
      s.choices?.some(c => c.text.toLowerCase().includes(q)),
    )
  })

  function scrollToScene(id: string) {
    searchQuery.value = ''
    highlightedId.value = id
    nextTick(() => {
      document.getElementById('scene-node-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    })
    setTimeout(() => {
      if (highlightedId.value === id) highlightedId.value = null
    }, 2000)
  }

  return { searchQuery, showSearch, highlightedId, searchResults, hideSearchDelayed, scrollToScene }
}
