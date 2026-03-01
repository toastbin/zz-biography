<script setup lang="ts">
import type { TreeNode } from '../composables/useTreeLayout'
import { CARD_H } from '../composables/useTreeLayout'

defineProps<{
  node: TreeNode
  isStart: boolean
  orphan?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  'add-linear': []
}>()
</script>

<template>
  <div
    class="tree-node"
    :class="[node.entry.sceneType, { orphan }]"
    :style="orphan ? undefined : { position: 'absolute', left: node.x + 'px', top: node.y + 'px' }"
    @click="emit('edit')"
  >
    <div class="node-header">
      <span class="node-id" :title="node.entry.scene.title ? node.id : undefined">
        {{ node.entry.scene.title || node.id }}
      </span>
      <span class="scene-badge" :class="node.entry.sceneType">
        {{ node.entry.sceneType.toUpperCase() }}
      </span>
      <button class="icon-btn node-delete" @click.stop="emit('delete')" title="删除">✕</button>
    </div>
    <p class="node-text">{{ node.entry.scene.text?.slice(0, 55) }}</p>
    <ul v-if="node.entry.sceneType === 'choice' && node.entry.scene.choices?.length" class="node-choices">
      <li v-for="(ch, i) in node.entry.scene.choices" :key="i">
        {{ i + 1 }}. {{ ch.text.slice(0, 16) }}
      </li>
    </ul>
  </div>

  <!-- Linear "+" button — shown below terminal linear nodes (no next set), not for orphans -->
  <button
    v-if="!orphan && node.entry.sceneType === 'linear' && !node.entry.scene.next"
    class="node-add-btn"
    :style="{ position: 'absolute', left: node.x + 'px', top: node.y + CARD_H + 'px' }"
    @click.stop="emit('add-linear')"
    title="在此节点后新建场景"
  >
    +
  </button>
</template>

<style scoped>
.tree-node {
  width: 220px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}
.tree-node:hover {
  border-color: rgba(240, 192, 64, 0.5);
  background: rgba(255, 255, 255, 0.07);
}
.tree-node.linear {
  border-left: 3px solid rgba(97, 175, 239, 0.5);
}
.tree-node.choice {
  border-left: 3px solid rgba(229, 192, 123, 0.5);
}
.tree-node.terminal {
  border-left: 3px solid rgba(152, 195, 121, 0.5);
}
.tree-node.orphan {
  position: relative;
  opacity: 0.65;
  border-style: dashed;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.node-id {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: #f0f0f0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.node-text {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.38);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.node-delete {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.tree-node:hover .node-delete {
  opacity: 1;
}

.node-choices {
  list-style: none;
  margin: 0;
  padding: 0;
}
.node-choices li {
  font-size: 0.7rem;
  color: rgba(229, 192, 123, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-badge {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;
}
.scene-badge.linear {
  color: #61afef;
  border-color: rgba(97, 175, 239, 0.4);
}
.scene-badge.choice {
  color: #e5c07b;
  border-color: rgba(229, 192, 123, 0.4);
}
.scene-badge.terminal {
  color: #98c379;
  border-color: rgba(152, 195, 121, 0.4);
}

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.icon-btn:hover {
  color: #e06c75;
}

.node-add-btn {
  width: 220px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(97, 175, 239, 0.08);
  border: 1px dashed rgba(97, 175, 239, 0.3);
  border-radius: 4px;
  color: rgba(97, 175, 239, 0.5);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  font-family: inherit;
}
.node-add-btn:hover {
  background: rgba(97, 175, 239, 0.18);
  border-color: rgba(97, 175, 239, 0.6);
  color: #61afef;
}
</style>
