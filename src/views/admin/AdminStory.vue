<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminApi, type SceneEntry } from '@/composables/useAdminApi'
import type { StoryManifest, RawStoryScene } from '@/types/story'
import { useAliasManager } from './composables/useAliasManager'
import { useTreeLayout } from './composables/useTreeLayout'
import AliasEditor from './components/AliasEditor.vue'
import SceneCard from './components/SceneCard.vue'
import SceneModal from './components/SceneModal.vue'
import QuickCreateModal from './components/QuickCreateModal.vue'

const route = useRoute()
const api = useAdminApi()

const characterId = computed(() => route.params.characterId as string)

// ─── load ─────────────────────────────────────────────────────────────────────

const manifest = ref<StoryManifest | null>(null)
const scenes = ref<SceneEntry[]>([])
const loading = ref(true)
const loadError = ref('')

// ─── manifest form ────────────────────────────────────────────────────────────

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

// ─── alias manager ────────────────────────────────────────────────────────────

const aliasManager = useAliasManager(manifest, api, characterId)
const { bgAliases, portraitAliases, bgSaving, portraitSaving, bgError, portraitError, bgSuccess, portraitSuccess } =
  aliasManager

onMounted(async () => {
  try {
    const data = await api.getStory(characterId.value)
    manifest.value = data.manifest
    scenes.value = data.scenes
    initManifestForm()
    aliasManager.initBgAliases()
    aliasManager.initPortraitAliases()
  } catch (e) {
    loadError.value = String(e)
  } finally {
    loading.value = false
  }
})

// ─── computed helpers ─────────────────────────────────────────────────────────

const sceneIds = computed(() => scenes.value.map(e => e.scene.id))
const knownBgKeys = computed(() => bgAliases.value.map(r => r.key).filter(Boolean))
const knownPortraitKeys = computed(() => portraitAliases.value.map(r => r.key).filter(Boolean))
const startSceneId = computed(() => manifest.value?.startSceneId ?? '')

// ─── tree layout ──────────────────────────────────────────────────────────────

const { treeLayout, nodeMap, edgePath, edgeLabelPos } = useTreeLayout(scenes, startSceneId)

// ─── scene search ─────────────────────────────────────────────────────────────

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

// ─── scene modal ──────────────────────────────────────────────────────────────

const sceneModalRef = ref<InstanceType<typeof SceneModal>>()
const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingEntry = ref<SceneEntry | null>(null)
const linAfterEntry = ref<SceneEntry | null>(null)
const suggestedId = ref('')
const sceneSaving = ref(false)
const sceneError = ref('')

function suggestNextId(parentId: string): string {
  const match = parentId.match(/^(.*?)(\d+)$/)
  if (!match || !match[1] || !match[2]) return ''
  const pfx = match[1]
  const num = parseInt(match[2], 10)
  const digits = match[2].length
  let n = num + 1
  while (scenes.value.some(e => e.scene.id === `${pfx}${String(n).padStart(digits, '0')}`)) {
    n++
  }
  return `${pfx}${String(n).padStart(digits, '0')}`
}

function openCreate() {
  modalMode.value = 'create'
  editingEntry.value = null
  linAfterEntry.value = null
  suggestedId.value = ''
  sceneError.value = ''
  modalOpen.value = true
}

function openEdit(entry: SceneEntry) {
  modalMode.value = 'edit'
  editingEntry.value = entry
  linAfterEntry.value = null
  suggestedId.value = ''
  sceneError.value = ''
  modalOpen.value = true
}

function openCreateFromLinear(entry: SceneEntry) {
  linAfterEntry.value = entry
  suggestedId.value = suggestNextId(entry.scene.id)
  modalMode.value = 'create'
  editingEntry.value = null
  sceneError.value = ''
  modalOpen.value = true
}

async function onSceneSave(scene: RawStoryScene) {
  sceneSaving.value = true
  sceneError.value = ''
  try {
    if (modalMode.value === 'create') {
      const entry = await api.createScene(characterId.value, scene)
      scenes.value.push(entry)

      if (linAfterEntry.value) {
        const parent = linAfterEntry.value
        const updatedParent: RawStoryScene = { ...parent.scene, next: scene.id }
        const updatedEntry = await api.updateScene(characterId.value, parent.filePath, updatedParent)
        const idx = scenes.value.findIndex(e => e.filePath === parent.filePath)
        if (idx !== -1) scenes.value[idx] = updatedEntry
        linAfterEntry.value = null
      }

      const data = await api.getStory(characterId.value)
      manifest.value = data.manifest
    } else {
      const entry = await api.updateScene(characterId.value, editingEntry.value!.filePath, scene)
      const idx = scenes.value.findIndex(e => e.filePath === editingEntry.value!.filePath)
      if (idx !== -1) scenes.value[idx] = entry
    }
    modalOpen.value = false
  } catch (e) {
    sceneError.value = String(e)
  } finally {
    sceneSaving.value = false
  }
}

// ─── quick-create modal ───────────────────────────────────────────────────────

const showQuickCreate = ref(false)
const quickCreateChoiceIdx = ref(-1)
const quickSaving = ref(false)
const quickError = ref('')

function handleOpenQuickCreate(choiceIdx: number) {
  quickCreateChoiceIdx.value = choiceIdx
  quickError.value = ''
  showQuickCreate.value = true
}

async function onQuickSave(scene: RawStoryScene, prefix: string) {
  quickSaving.value = true
  quickError.value = ''
  try {
    const entry = await api.createScene(characterId.value, scene, prefix || undefined)
    scenes.value.push(entry)
    sceneModalRef.value?.linkChoiceScene(quickCreateChoiceIdx.value, entry.scene.id)
    showQuickCreate.value = false
  } catch (e) {
    quickError.value = String(e)
  } finally {
    quickSaving.value = false
  }
}

// ─── normalize names ──────────────────────────────────────────────────────────

const normalizing = ref(false)
const normalizeMsg = ref('')

async function doNormalizeNames() {
  if (!confirm('将根据 choice 索引重命名所有场景文件（文件路径变更，场景 ID 不变）。确认继续？')) return
  normalizing.value = true
  normalizeMsg.value = ''
  try {
    const result = await api.normalizeNames(characterId.value)
    const n = result.renamed.length
    normalizeMsg.value = n > 0 ? `已重命名 ${n} 个文件` : '无需重命名'
    const data = await api.getStory(characterId.value)
    manifest.value = data.manifest
    scenes.value = data.scenes
    setTimeout(() => (normalizeMsg.value = ''), 3000)
  } catch (e) {
    normalizeMsg.value = String(e)
  } finally {
    normalizing.value = false
  }
}

// ─── delete scene ─────────────────────────────────────────────────────────────

async function deleteScene(entry: SceneEntry) {
  const isStart = entry.scene.id === manifest.value?.startSceneId
  const msg = isStart
    ? `正在删除起始场景「${entry.scene.id}」，请先更新 startSceneId！确定要继续删除吗？`
    : `确定要删除场景「${entry.scene.id}」吗？`
  if (!confirm(msg)) return

  try {
    await api.deleteScene(characterId.value, entry.filePath)
    scenes.value = scenes.value.filter(e => e.filePath !== entry.filePath)
    const data = await api.getStory(characterId.value)
    manifest.value = data.manifest
  } catch (e) {
    alert(String(e))
  }
}
</script>

<template>
  <div class="admin-story">
    <div v-if="loading" class="full-center">
      <p class="state-msg">加载中…</p>
    </div>
    <div v-else-if="loadError" class="full-center">
      <p class="state-msg error">{{ loadError }}</p>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <router-link to="/admin" class="nav-link">← 管理首页</router-link>
          <h1 class="page-title">{{ characterId }} / 故事编辑</h1>
        </div>
      </header>

      <!-- Two-column body -->
      <div class="editor-body">
        <!-- LEFT: Manifest + Aliases -->
        <aside class="left-col">
          <!-- Manifest section -->
          <section class="section">
            <h2 class="section-title">MANIFEST</h2>
            <label class="field-label">
              defaultSpeaker
              <input v-model="mfDefaultSpeaker" class="field-input" placeholder="角色名" />
            </label>
            <label class="field-label">
              startSceneId
              <select v-model="mfStartSceneId" class="field-select">
                <option value="">（未设置）</option>
                <option v-for="sid in sceneIds" :key="sid" :value="sid">{{ sid }}</option>
              </select>
            </label>
            <p v-if="mfError" class="field-error">{{ mfError }}</p>
            <p v-if="mfSuccess" class="field-success">已保存</p>
            <button class="btn primary sm" :disabled="mfSaving" @click="saveManifestCore">
              {{ mfSaving ? '保存中…' : 'Save Manifest' }}
            </button>
          </section>

          <!-- BG Aliases -->
          <AliasEditor
            title="BG ALIASES"
            :rows="bgAliases"
            value-placeholder="/bg/…"
            :saving="bgSaving"
            :error="bgError"
            :success="bgSuccess"
            @update:rows="bgAliases = $event"
            @save="aliasManager.saveBg()"
          />

          <!-- Portrait Aliases -->
          <AliasEditor
            title="PORTRAIT ALIASES"
            :rows="portraitAliases"
            value-placeholder="/portraits/…"
            :saving="portraitSaving"
            :error="portraitError"
            :success="portraitSuccess"
            @update:rows="portraitAliases = $event"
            @save="aliasManager.savePortraits()"
          />
        </aside>

        <!-- RIGHT: Decision tree -->
        <main class="tree-col">
          <div class="scenes-header">
            <h2 class="section-title">SCENES</h2>
            <div class="scenes-header-actions">
              <div class="search-wrap">
                <input
                  v-model="searchQuery"
                  class="search-input"
                  placeholder="搜索场景…"
                  @focus="showSearch = true"
                  @blur="hideSearchDelayed"
                />
                <ul v-if="showSearch && searchResults.length" class="search-dropdown">
                  <li
                    v-for="e in searchResults"
                    :key="e.scene.id"
                    class="search-item"
                    @mousedown.prevent="scrollToScene(e.scene.id)"
                  >
                    <span class="si-id">{{ e.scene.id }}</span>
                    <span class="si-meta">
                      <span v-if="e.scene.title" class="si-title">{{ e.scene.title }}</span>
                      <span v-if="e.scene.text" class="si-text">{{ e.scene.text.slice(0, 50) }}</span>
                    </span>
                  </li>
                </ul>
              </div>
              <span v-if="normalizeMsg" class="normalize-msg">{{ normalizeMsg }}</span>
              <button class="btn sm" :disabled="normalizing" @click="doNormalizeNames">
                {{ normalizing ? '处理中…' : '规范化命名' }}
              </button>
              <button class="btn primary sm" @click="openCreate">+ New Scene</button>
            </div>
          </div>

          <div class="tree-scroll">
            <!-- Main tree canvas -->
            <div
              class="tree-canvas"
              :style="{ width: treeLayout.canvasW + 'px', minHeight: treeLayout.canvasH + 'px' }"
            >
              <!-- SVG edge layer -->
              <svg class="tree-svg" :width="treeLayout.canvasW" :height="treeLayout.canvasH">
                <g v-for="edge in treeLayout.edges" :key="`${edge.fromId}-${edge.toId}`">
                  <path
                    v-if="nodeMap.get(edge.fromId) && nodeMap.get(edge.toId)"
                    :d="edgePath(edge)"
                    :stroke="edge.color"
                    stroke-width="1.5"
                    fill="none"
                    opacity="0.5"
                  />
                  <text
                    v-if="edge.label && nodeMap.get(edge.fromId) && nodeMap.get(edge.toId)"
                    :x="edgeLabelPos(edge).x"
                    :y="edgeLabelPos(edge).y"
                    class="edge-label"
                  >{{ edge.label.slice(0, 14) }}</text>
                </g>
              </svg>

              <!-- Tree node cards -->
              <SceneCard
                v-for="node in treeLayout.nodes"
                :key="node.id"
                :node="node"
                :is-start="node.id === startSceneId"
                :highlighted="node.id === highlightedId"
                @edit="openEdit(node.entry)"
                @delete="deleteScene(node.entry)"
                @add-linear="openCreateFromLinear(node.entry)"
              />
            </div>

            <!-- Orphans: scenes not reachable from startSceneId -->
            <div v-if="treeLayout.orphans.length" class="orphans-section">
              <p class="orphans-title">未连接场景</p>
              <div class="orphans-list">
                <SceneCard
                  v-for="entry in treeLayout.orphans"
                  :key="entry.scene.id"
                  :node="{ id: entry.scene.id, entry, col: 0, row: 0, x: 0, y: 0 }"
                  :is-start="false"
                  orphan
                  :highlighted="entry.scene.id === highlightedId"
                  @edit="openEdit(entry)"
                  @delete="deleteScene(entry)"
                  @add-linear="() => {}"
                />
              </div>
            </div>

            <p v-if="treeLayout.nodes.length === 0 && treeLayout.orphans.length === 0" class="state-msg">
              暂无场景
            </p>
          </div>
        </main>
      </div>
    </template>

    <!-- Scene Editor Modal -->
    <SceneModal
      ref="sceneModalRef"
      :open="modalOpen"
      :mode="modalMode"
      :entry="editingEntry ?? undefined"
      :all-scene-ids="sceneIds"
      :known-bg-keys="knownBgKeys"
      :known-portrait-keys="knownPortraitKeys"
      :saving="sceneSaving"
      :save-error="sceneError"
      :suggested-id="suggestedId"
      @save="onSceneSave"
      @cancel="modalOpen = false"
      @open-quick-create="handleOpenQuickCreate"
    />

    <!-- Quick-Create Modal (from choice row "+") -->
    <QuickCreateModal
      :open="showQuickCreate"
      :parent-id="editingEntry?.scene.id ?? ''"
      :choice-idx="quickCreateChoiceIdx"
      :all-scene-ids="sceneIds"
      :known-bg-keys="knownBgKeys"
      :known-portrait-keys="knownPortraitKeys"
      :saving="quickSaving"
      :save-error="quickError"
      @save="onQuickSave"
      @cancel="showQuickCreate = false"
    />
  </div>
</template>

<style scoped>
.admin-story {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, #0d1a2e 0%, #06080f 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.full-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Header */
.page-header {
  padding: 1rem 1.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
  white-space: nowrap;
}
.nav-link:hover {
  color: #f0c040;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f0c040;
  letter-spacing: 0.08em;
  margin: 0;
}

/* Body layout */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-col {
  width: 28%;
  min-width: 180px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tree-col {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.5rem 0;
}

/* Manifest section */
.section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  margin: 0 0 0.2rem;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.field-input,
.field-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #f0f0f0;
  padding: 0.4rem 0.6rem;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  resize: vertical;
}
.field-input:focus,
.field-select:focus {
  border-color: rgba(240, 192, 64, 0.55);
}

.field-error {
  color: #e06c75;
  font-size: 0.8rem;
  margin: 0;
}
.field-success {
  color: #6dbf7a;
  font-size: 0.8rem;
  margin: 0;
}

/* Scenes header */
.scenes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scenes-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.normalize-msg {
  font-size: 0.78rem;
  color: #6dbf7a;
}

/* Tree layout */
.tree-scroll {
  flex: 1;
  overflow: auto;
  padding-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tree-canvas {
  position: relative;
  flex-shrink: 0;
}

.tree-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.edge-label {
  font-size: 10px;
  fill: rgba(229, 192, 123, 0.6);
  font-family: inherit;
  text-anchor: middle;
  pointer-events: none;
}

/* Orphans section */
.orphans-section {
  padding-top: 0.75rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}
.orphans-title {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.22);
  text-transform: uppercase;
  margin: 0 0 0.6rem;
}
.orphans-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* State messages */
.state-msg {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
}
.state-msg.error {
  color: #e06c75;
}

/* Buttons */
.btn {
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  font-family: inherit;
}
.btn.sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
.btn:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.1);
  border-color: rgba(240, 192, 64, 0.45);
  color: #f0c040;
}
.btn.primary {
  border-color: rgba(240, 192, 64, 0.5);
  color: #f0c040;
}
.btn.primary:hover:not(:disabled) {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Scene search */
.search-wrap {
  position: relative;
}
.search-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #f0f0f0;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  outline: none;
  width: 180px;
  font-family: inherit;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: rgba(240, 192, 64, 0.55);
}
.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 280px;
  background: rgba(10, 10, 20, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  list-style: none;
  margin: 0;
  padding: 0.3rem 0;
  z-index: 100;
  max-height: 260px;
  overflow-y: auto;
}
.search-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
.search-item:hover {
  background: rgba(240, 192, 64, 0.1);
}
.si-id {
  font-family: monospace;
  font-size: 0.78rem;
  color: #f0c040;
  flex-shrink: 0;
}
.si-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  overflow: hidden;
}
.si-title {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.si-text {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.38);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
