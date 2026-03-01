import { computed } from 'vue'
import type { Ref } from 'vue'
import type { SceneEntry } from '@/composables/useAdminApi'

export const CARD_W = 220
export const CARD_H = 110
const COL_STEP = 360
const ROW_STEP = 150

export interface TreeNode {
  id: string
  entry: SceneEntry
  col: number
  row: number
  x: number
  y: number
}

export interface TreeEdge {
  fromId: string
  toId: string
  label?: string
  fromAnchorY: number
  toAnchorY: number
  color: string
}

export function useTreeLayout(scenes: Ref<SceneEntry[]>, startSceneId: Ref<string>) {
  const treeLayout = computed(() => {
    const entryMap = new Map(scenes.value.map(e => [e.scene.id, e]))
    const visited = new Map<string, { col: number; row: number }>()
    const colNextRow = new Map<number, number>()
    const nodes: TreeNode[] = []
    const edges: TreeEdge[] = []
    const orphans: SceneEntry[] = []

    const startId = startSceneId.value
    if (!startId || !entryMap.has(startId)) {
      orphans.push(...scenes.value)
      return { nodes, edges, orphans, canvasW: 0, canvasH: 80 }
    }

    visited.set(startId, { col: 0, row: 0 })
    colNextRow.set(0, 1)
    const queue: string[] = [startId]

    while (queue.length) {
      const id = queue.shift()!
      const entry = entryMap.get(id)
      if (!entry) continue
      const { col, row } = visited.get(id)!
      nodes.push({ id, entry, col, row, x: col * COL_STEP, y: row * ROW_STEP })

      const outgoing: Array<{ targetId: string; label?: string }> = []
      if (entry.scene.next) {
        outgoing.push({ targetId: entry.scene.next })
      } else if (entry.scene.choices) {
        for (const ch of entry.scene.choices) {
          if (ch.nextSceneId) outgoing.push({ targetId: ch.nextSceneId, label: ch.text })
        }
      }

      const n = outgoing.length
      outgoing.forEach(({ targetId, label }, i) => {
        if (!entryMap.has(targetId)) return
        if (!visited.has(targetId)) {
          const nextCol = col + 1
          const nextRow = colNextRow.get(nextCol) ?? 0
          visited.set(targetId, { col: nextCol, row: nextRow })
          colNextRow.set(nextCol, nextRow + 1)
          queue.push(targetId)
        }
        const fromAnchorY = n === 1 ? 0.5 : (i + 1) / (n + 1)
        edges.push({
          fromId: id,
          toId: targetId,
          label,
          fromAnchorY,
          toAnchorY: 0.5,
          color: label ? '#e5c07b' : '#61afef',
        })
      })
    }

    for (const entry of scenes.value) {
      if (!visited.has(entry.scene.id)) orphans.push(entry)
    }

    const maxX = nodes.length ? Math.max(...nodes.map(n => n.x)) + CARD_W : 0
    const maxY = nodes.length ? Math.max(...nodes.map(n => n.y)) + CARD_H : 0
    return { nodes, edges, orphans, canvasW: maxX + 60, canvasH: maxY + 60 }
  })

  const nodeMap = computed(() => new Map(treeLayout.value.nodes.map(n => [n.id, n])))

  function edgePath(edge: TreeEdge): string {
    const from = nodeMap.value.get(edge.fromId)
    const to = nodeMap.value.get(edge.toId)
    if (!from || !to) return ''
    const fx = from.x + CARD_W
    const fy = from.y + CARD_H * edge.fromAnchorY
    const tx = to.x
    const ty = to.y + CARD_H * edge.toAnchorY
    const cx = (fx + tx) / 2
    return `M ${fx} ${fy} C ${cx} ${fy} ${cx} ${ty} ${tx} ${ty}`
  }

  function edgeLabelPos(edge: TreeEdge): { x: number; y: number } {
    const from = nodeMap.value.get(edge.fromId)!
    const to = nodeMap.value.get(edge.toId)!
    return {
      x: (from.x + CARD_W + to.x) / 2,
      y: (from.y + CARD_H * edge.fromAnchorY + to.y + CARD_H * edge.toAnchorY) / 2 - 5,
    }
  }

  return { treeLayout, nodeMap, edgePath, edgeLabelPos }
}
