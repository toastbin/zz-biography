<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterStory } from '@/types/story'
import type { TreeNode, TreeBranch } from '@/types/tree'
import DecisionTreeNode from './DecisionTreeNode.vue'

const props = defineProps<{
  story: CharacterStory
  visitedPath: string[]
  choicesTaken: Record<string, number>
}>()

const emit = defineEmits<{
  rewind: [sceneId: string]
  close: []
}>()

function buildNode(sceneId: string, visited: Set<string>, building: Set<string>): TreeNode | null {
  if (building.has(sceneId)) return null
  const scene = props.story.scenes[sceneId]
  if (!scene) return null

  building.add(sceneId)
  const isVisited = visited.has(sceneId)
  const isCurrent = sceneId === props.visitedPath[props.visitedPath.length - 1]

  let branches: TreeBranch[] = []
  let child: TreeNode | null = null

  if (scene.choices && scene.choices.length > 0) {
    const takenIndex = props.choicesTaken[sceneId]
    branches = scene.choices.map((c, i) => ({
      text: c.text,
      nextSceneId: c.nextSceneId,
      taken: takenIndex === i,
      subtree: visited.has(c.nextSceneId)
        ? buildNode(c.nextSceneId, visited, new Set(building))
        : null,
    }))
  } else if (scene.next) {
    child = visited.has(scene.next)
      ? buildNode(scene.next, visited, new Set(building))
      : null
  }

  building.delete(sceneId)
  return { scene, visited: isVisited, isCurrent, branches, child }
}

const tree = computed<TreeNode | null>(() => {
  const visited = new Set(props.visitedPath)
  return buildNode(props.story.startSceneId, visited, new Set())
})
</script>

<template>
  <div class="tree-overlay" @click.self="emit('close')">
    <div class="tree-header">
      <span class="tree-title">决策树</span>
      <button class="tree-close" @click="emit('close')">✕</button>
    </div>
    <div class="tree-scroll">
      <div class="tree-root">
        <DecisionTreeNode
          v-if="tree"
          :node="tree"
          @rewind="(id) => { emit('rewind', id) }"
        />
        <div v-else class="tree-empty">暂无数据</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 18, 0.96);
  z-index: 25;
  display: flex;
  flex-direction: column;
}

.tree-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tree-title {
  color: #f0c040;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.tree-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  transition: color 0.2s;
}

.tree-close:hover {
  color: #f0c040;
}

/* Both axes scrollable for wide/tall trees */
.tree-scroll {
  flex: 1;
  overflow: auto;
  padding: 2.5rem 3rem;
}

/* inline-flex lets the root take its natural width so horizontal scroll works */
.tree-root {
  display: inline-flex;
  min-width: 100%;
  min-height: 100%;
  align-items: center;
}

.tree-empty {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.9rem;
}
</style>
