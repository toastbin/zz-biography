import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { TreeNode, TreeEdge } from './useTreeLayout'

interface TreeLayout {
  nodes: TreeNode[]
  edges: TreeEdge[]
}

export function useSubtreeCollapse(treeLayout: ComputedRef<TreeLayout>) {
  const collapsedIds = ref(new Set<string>())

  const childrenMap = computed(() => {
    const map = new Map<string, string[]>()
    for (const edge of treeLayout.value.edges) {
      if (!map.has(edge.fromId)) map.set(edge.fromId, [])
      map.get(edge.fromId)!.push(edge.toId)
    }
    return map
  })

  const hiddenNodeIds = computed(() => {
    const hidden = new Set<string>()
    for (const id of collapsedIds.value) {
      const queue = [...(childrenMap.value.get(id) ?? [])]
      while (queue.length) {
        const cur = queue.shift()!
        if (!hidden.has(cur)) {
          hidden.add(cur)
          queue.push(...(childrenMap.value.get(cur) ?? []))
        }
      }
    }
    return hidden
  })

  const visibleNodes = computed(() => treeLayout.value.nodes.filter(n => !hiddenNodeIds.value.has(n.id)))

  const visibleEdges = computed(() =>
    treeLayout.value.edges.filter(
      e => !hiddenNodeIds.value.has(e.fromId) && !hiddenNodeIds.value.has(e.toId),
    ),
  )

  function toggleCollapse(nodeId: string) {
    const next = new Set(collapsedIds.value)
    if (next.has(nodeId)) next.delete(nodeId)
    else next.add(nodeId)
    collapsedIds.value = next
  }

  return { collapsedIds, childrenMap, visibleNodes, visibleEdges, toggleCollapse }
}
