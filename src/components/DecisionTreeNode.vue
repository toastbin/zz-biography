<!-- Options API name block enables self-referencing recursion -->
<script lang="ts">
export default { name: 'DecisionTreeNode' }
</script>

<script setup lang="ts">
import type { TreeNode } from '@/types/tree'
import DecisionTreeNode from './DecisionTreeNode.vue'

const props = defineProps<{ node: TreeNode }>()
const emit = defineEmits<{ rewind: [sceneId: string] }>()

function truncate(text: string, len = 55): string {
  return text.length > len ? text.slice(0, len) + '…' : text
}

function handleClick() {
  if (props.node.visited && !props.node.isCurrent) {
    emit('rewind', props.node.scene.id)
  }
}
</script>

<template>
  <div class="tn">
    <!-- ── Card ── -->
    <div
      class="tn-card"
      :class="{
        'tn-visited': node.visited && !node.isCurrent,
        'tn-current': node.isCurrent,
        'tn-unvisited': !node.visited,
      }"
      @click="handleClick"
    >
      <div
        class="tn-thumb"
        :style="node.scene.background ? { backgroundImage: `url(${node.scene.background})` } : {}"
      />
      <div class="tn-body">
        <span v-if="node.scene.speaker" class="tn-speaker">{{ node.scene.speaker }}</span>
        <p class="tn-text">{{ truncate(node.scene.text) }}</p>
      </div>
      <div class="tn-footer">
        <span v-if="node.isCurrent" class="tn-tag tn-tag-current">◆ 当前</span>
        <span v-else-if="node.visited" class="tn-tag tn-tag-visited">↩ 点击回溯</span>
        <span v-else class="tn-tag tn-tag-unvisited">○ 未到达</span>
      </div>
    </div>

    <!-- ── Single linear child ── -->
    <template v-if="node.child">
      <div class="tn-line" />
      <DecisionTreeNode :node="node.child" @rewind="emit('rewind', $event)" />
    </template>

    <!-- ── Choice branches ── -->
    <template v-else-if="node.branches.length > 0">
      <div class="tn-line" />
      <div class="tn-branches">
        <div v-for="(branch, i) in node.branches" :key="i" class="tn-branch">
          <span
            class="tn-blabel"
            :class="branch.taken ? 'tn-blabel-taken' : 'tn-blabel-untaken'"
          >
            {{ branch.taken ? '✅' : '❓' }} {{ branch.text }}
          </span>
          <div class="tn-bline" />
          <DecisionTreeNode
            v-if="branch.subtree"
            :node="branch.subtree"
            @rewind="emit('rewind', $event)"
          />
          <!-- Ghost card for untaken / unvisited branch -->
          <div v-else class="tn-card tn-ghost">
            <div class="tn-thumb tn-thumb-empty" />
            <div class="tn-body">
              <p class="tn-text tn-text-ghost">❓ 未知路径</p>
            </div>
            <div class="tn-footer">
              <span class="tn-tag tn-tag-unvisited">○ 未到达</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Row wrapper ─────────────────────────────────── */
.tn {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
}

/* ── Card ────────────────────────────────────────── */
.tn-card {
  width: 164px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(10, 10, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  cursor: default;
}

.tn-visited {
  cursor: pointer;
  border-color: rgba(255, 255, 255, 0.22);
}

.tn-visited:hover {
  border-color: #f0c040;
  box-shadow: 0 0 14px rgba(240, 192, 64, 0.28);
}

.tn-current {
  border-color: #f0c040;
  box-shadow: 0 0 18px rgba(240, 192, 64, 0.35);
}

.tn-unvisited {
  opacity: 0.38;
}

.tn-ghost {
  opacity: 0.3;
}

/* ── Thumbnail ───────────────────────────────────── */
.tn-thumb {
  width: 100%;
  height: 90px;
  background-size: cover;
  background-position: center top;
  background-color: rgba(255, 255, 255, 0.04);
}

.tn-thumb-empty {
  background-color: rgba(255, 255, 255, 0.03);
}

/* ── Body ────────────────────────────────────────── */
.tn-body {
  padding: 0.5rem 0.6rem 0.3rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.tn-speaker {
  display: block;
  font-size: 0.62rem;
  color: #f0c040;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 0.22rem;
}

.tn-text {
  font-size: 0.72rem;
  color: #ddd;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tn-text-ghost {
  color: rgba(255, 255, 255, 0.3);
}

/* ── Footer ──────────────────────────────────────── */
.tn-footer {
  padding: 0.15rem 0.6rem 0.45rem;
}

.tn-tag {
  font-size: 0.6rem;
  letter-spacing: 0.02em;
}

.tn-tag-current {
  color: #f0c040;
}

.tn-tag-visited {
  color: rgba(255, 255, 255, 0.38);
}

.tn-tag-unvisited {
  color: rgba(255, 255, 255, 0.2);
}

/* ── Horizontal connector (card → next) ──────────── */
.tn-line {
  width: 32px;
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

/* ── Branches column ─────────────────────────────── */
.tn-branches {
  display: flex;
  flex-direction: column;
  border-left: 2px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

/* each branch row */
.tn-branch {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 12px 0;
}

/* horizontal arm from the vertical bar */
.tn-branch::before {
  content: '';
  display: block;
  width: 16px;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

/* branch choice label */
.tn-blabel {
  font-size: 0.65rem;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.tn-blabel-taken {
  color: rgba(255, 255, 255, 0.82);
  border-color: rgba(255, 255, 255, 0.22);
}

.tn-blabel-untaken {
  color: rgba(255, 255, 255, 0.3);
}

/* short connector from label to child card */
.tn-bline {
  width: 12px;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}
</style>
