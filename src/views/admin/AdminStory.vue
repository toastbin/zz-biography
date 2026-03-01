<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminApi, type SceneEntry } from '@/composables/useAdminApi'
import type { StoryManifest, RawStoryScene, StoryAssets } from '@/types/story'

// ─── tree layout constants ────────────────────────────────────────────────────

const CARD_W = 220
const CARD_H = 110
const COL_STEP = 360
const ROW_STEP = 150

interface TreeNode {
  id: string
  entry: SceneEntry
  col: number
  row: number
  x: number
  y: number
}

interface TreeEdge {
  fromId: string
  toId: string
  label?: string
  fromAnchorY: number
  toAnchorY: number
  color: string
}

const route = useRoute()
const api = useAdminApi()

const characterId = computed(() => route.params.characterId as string)

// ─── load ─────────────────────────────────────────────────────────────────────

const manifest = ref<StoryManifest | null>(null)
const scenes = ref<SceneEntry[]>([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const data = await api.getStory(characterId.value)
    manifest.value = data.manifest
    scenes.value = data.scenes
    initManifestForm()
    initBgAliases()
    initPortraitAliases()
  } catch (e) {
    loadError.value = String(e)
  } finally {
    loading.value = false
  }
})

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

// ─── asset alias editors ──────────────────────────────────────────────────────

interface AliasRow { key: string; value: string }

const bgAliases = ref<AliasRow[]>([])
const portraitAliases = ref<AliasRow[]>([])
const bgSaving = ref(false)
const portraitSaving = ref(false)
const bgError = ref('')
const portraitError = ref('')
const bgSuccess = ref(false)
const portraitSuccess = ref(false)

function aliasesToRows(record: Record<string, string> | undefined): AliasRow[] {
  return Object.entries(record ?? {}).map(([key, value]) => ({ key, value }))
}

function rowsToRecord(rows: AliasRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { key, value } of rows) {
    if (key.trim()) out[key.trim()] = value
  }
  return out
}

function initBgAliases() {
  bgAliases.value = aliasesToRows(manifest.value?.assets?.bg)
}

function initPortraitAliases() {
  portraitAliases.value = aliasesToRows(manifest.value?.assets?.portrait)
}

async function saveBg() {
  if (!manifest.value) return
  bgSaving.value = true
  bgError.value = ''
  bgSuccess.value = false
  try {
    const assets: StoryAssets = {
      ...manifest.value.assets,
      bg: rowsToRecord(bgAliases.value),
    }
    const updated = await api.updateManifest(characterId.value, { assets })
    manifest.value = updated
    initBgAliases()
    bgSuccess.value = true
    setTimeout(() => (bgSuccess.value = false), 2000)
  } catch (e) {
    bgError.value = String(e)
  } finally {
    bgSaving.value = false
  }
}

async function savePortraits() {
  if (!manifest.value) return
  portraitSaving.value = true
  portraitError.value = ''
  portraitSuccess.value = false
  try {
    const assets: StoryAssets = {
      ...manifest.value.assets,
      portrait: rowsToRecord(portraitAliases.value),
    }
    const updated = await api.updateManifest(characterId.value, { assets })
    manifest.value = updated
    initPortraitAliases()
    portraitSuccess.value = true
    setTimeout(() => (portraitSuccess.value = false), 2000)
  } catch (e) {
    portraitError.value = String(e)
  } finally {
    portraitSaving.value = false
  }
}

// ─── scene modal ──────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit'

const modalOpen = ref(false)
const modalMode = ref<ModalMode>('create')
const editingEntry = ref<SceneEntry | null>(null)

// form fields
const fId = ref('')
const fBackground = ref('')
const fPortrait = ref('')
const fSpeaker = ref('')
const fText = ref('')
const fType = ref<'linear' | 'choice' | 'terminal'>('linear')
const fNext = ref('')
const fChoices = ref<Array<{ text: string; nextSceneId: string; condition: string }>>([])

const fError = ref('')
const fSaving = ref(false)

function openCreate() {
  modalMode.value = 'create'
  editingEntry.value = null
  fId.value = ''
  fBackground.value = ''
  fPortrait.value = ''
  fSpeaker.value = ''
  fText.value = ''
  fType.value = 'linear'
  fNext.value = ''
  fChoices.value = []
  fError.value = ''
  modalOpen.value = true
}

function openEdit(entry: SceneEntry) {
  modalMode.value = 'edit'
  editingEntry.value = entry
  const s = entry.scene
  fId.value = s.id
  fBackground.value = s.background ?? ''
  fPortrait.value = s.portrait ?? ''
  fSpeaker.value = s.speaker ?? ''
  fText.value = s.text ?? ''
  fType.value = entry.sceneType
  fNext.value = s.next ?? ''
  fChoices.value = (s.choices ?? []).map(c => ({
    text: c.text,
    nextSceneId: c.nextSceneId,
    condition: c.condition ?? '',
  }))
  fError.value = ''
  modalOpen.value = true
}

function addChoice() {
  fChoices.value.push({ text: '', nextSceneId: '', condition: '' })
}

function removeChoice(i: number) {
  fChoices.value.splice(i, 1)
}

function buildSceneFromForm(): RawStoryScene {
  const scene: RawStoryScene = {
    id: fId.value,
    background: fBackground.value,
    text: fText.value,
  }
  if (fPortrait.value) scene.portrait = fPortrait.value
  if (fSpeaker.value) scene.speaker = fSpeaker.value
  if (fType.value === 'linear') {
    scene.next = fNext.value
  } else if (fType.value === 'choice') {
    scene.choices = fChoices.value
      .filter(c => c.text || c.nextSceneId)
      .map(c => ({
        text: c.text,
        nextSceneId: c.nextSceneId,
        ...(c.condition ? { condition: c.condition } : {}),
      }))
  }
  return scene
}

// ─── linear "+" quick-add ─────────────────────────────────────────────────────

const linAfterEntry = ref<SceneEntry | null>(null)

function suggestNextId(parentId: string): string {
  // Extract trailing number and increment: m_001 → m_002, w_003 → w_004
  const match = parentId.match(/^(.*?)(\d+)$/)
  if (!match || !match[1] || !match[2]) return ''
  const pfx = match[1]
  const num = parseInt(match[2], 10)
  const digits = match[2].length
  // Find next free number
  let n = num + 1
  while (scenes.value.some(e => e.scene.id === `${pfx}${String(n).padStart(digits, '0')}`)) {
    n++
  }
  return `${pfx}${String(n).padStart(digits, '0')}`
}

function openCreateFromLinear(entry: SceneEntry) {
  linAfterEntry.value = entry
  openCreate()
  fId.value = suggestNextId(entry.scene.id)
  fType.value = 'linear'
}

async function saveScene() {
  fError.value = ''
  const id = fId.value.trim()

  if (modalMode.value === 'create') {
    if (!id || !/^[\w-]+$/.test(id)) {
      fError.value = '场景 ID 只允许字母、数字、下划线、连字符'
      return
    }
    if (scenes.value.some(e => e.scene.id === id)) {
      fError.value = '该 ID 已存在'
      return
    }
  }

  if (fType.value === 'choice') {
    const valid = fChoices.value.filter(c => c.text.trim() && c.nextSceneId)
    if (valid.length === 0) {
      fError.value = 'Choice 类型至少需要一个完整的选项（文本 + 目标场景）'
      return
    }
  }

  fSaving.value = true
  try {
    const scene = buildSceneFromForm()
    if (modalMode.value === 'create') {
      const entry = await api.createScene(characterId.value, scene)
      scenes.value.push(entry)

      // If triggered from linear "+", update parent's next field
      if (linAfterEntry.value) {
        const parent = linAfterEntry.value
        const updatedParent: RawStoryScene = { ...parent.scene, next: scene.id }
        const updatedEntry = await api.updateScene(characterId.value, parent.filePath, updatedParent)
        const idx = scenes.value.findIndex(e => e.filePath === parent.filePath)
        if (idx !== -1) scenes.value[idx] = updatedEntry
        linAfterEntry.value = null
      }

      // Refresh manifest to get updated scenes list
      const data = await api.getStory(characterId.value)
      manifest.value = data.manifest
    } else {
      const entry = await api.updateScene(characterId.value, editingEntry.value!.filePath, scene)
      const idx = scenes.value.findIndex(e => e.filePath === editingEntry.value!.filePath)
      if (idx !== -1) scenes.value[idx] = entry
    }
    modalOpen.value = false
  } catch (e) {
    fError.value = String(e)
  } finally {
    fSaving.value = false
  }
}

// ─── quick-create modal (from choice row "+") ─────────────────────────────────

const showQuickCreate = ref(false)
const qcChoiceIdx = ref(-1)
const qcFolderPrefix = ref('')
const qfId = ref('')
const qfBackground = ref('')
const qfPortrait = ref('')
const qfSpeaker = ref('')
const qfText = ref('')
const qfError = ref('')
const qfSaving = ref(false)

function openQuickCreate(choiceIdx: number) {
  qcChoiceIdx.value = choiceIdx
  qcFolderPrefix.value = `c${choiceIdx + 1}/`
  // Auto-suggest id based on character prefix and existing scenes
  const charPrefix = characterId.value.slice(0, 1)
  let n = 1
  while (scenes.value.some(e => e.scene.id === `${charPrefix}_${String(n).padStart(3, '0')}`)) {
    n++
  }
  qfId.value = `${charPrefix}_${String(n).padStart(3, '0')}`
  qfBackground.value = ''
  qfPortrait.value = ''
  qfSpeaker.value = ''
  qfText.value = ''
  qfError.value = ''
  showQuickCreate.value = true
}

async function saveQuickCreate() {
  qfError.value = ''
  const id = qfId.value.trim()
  if (!id || !/^[\w-]+$/.test(id)) {
    qfError.value = '场景 ID 只允许字母、数字、下划线、连字符'
    return
  }
  if (scenes.value.some(e => e.scene.id === id)) {
    qfError.value = '该 ID 已存在'
    return
  }

  const scene: RawStoryScene = {
    id,
    background: qfBackground.value,
    text: qfText.value,
  }
  if (qfPortrait.value) scene.portrait = qfPortrait.value
  if (qfSpeaker.value) scene.speaker = qfSpeaker.value

  qfSaving.value = true
  try {
    const entry = await api.createScene(characterId.value, scene, qcFolderPrefix.value || undefined)
    scenes.value.push(entry)
    // Link into parent choice
    const choiceRow = fChoices.value[qcChoiceIdx.value]
    if (qcChoiceIdx.value >= 0 && choiceRow) {
      choiceRow.nextSceneId = id
    }
    showQuickCreate.value = false
  } catch (e) {
    qfError.value = String(e)
  } finally {
    qfSaving.value = false
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
    // Reload
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
    // Refresh manifest
    const data = await api.getStory(characterId.value)
    manifest.value = data.manifest
  } catch (e) {
    alert(String(e))
  }
}

// ─── computed helpers ─────────────────────────────────────────────────────────

const sceneIds = computed(() => scenes.value.map(e => e.scene.id))

const knownBgKeys = computed(() => bgAliases.value.map(r => r.key).filter(Boolean))
const knownPortraitKeys = computed(() => portraitAliases.value.map(r => r.key).filter(Boolean))

// ─── tree layout ──────────────────────────────────────────────────────────────

const treeLayout = computed(() => {
  const entryMap = new Map(scenes.value.map(e => [e.scene.id, e]))
  const visited = new Map<string, { col: number; row: number }>()
  const colNextRow = new Map<number, number>()
  const nodes: TreeNode[] = []
  const edges: TreeEdge[] = []
  const orphans: SceneEntry[] = []

  const startId = manifest.value?.startSceneId
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
          <section class="section">
            <h2 class="section-title">BG ALIASES</h2>
            <table class="alias-table">
              <tbody>
                <tr v-for="(row, i) in bgAliases" :key="i">
                  <td><input v-model="row.key" class="alias-input" placeholder="alias" /></td>
                  <td class="arrow-cell">→</td>
                  <td><input v-model="row.value" class="alias-input wide" placeholder="/bg/…" /></td>
                  <td>
                    <button class="icon-btn" @click="bgAliases.splice(i, 1)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="bgError" class="field-error">{{ bgError }}</p>
            <p v-if="bgSuccess" class="field-success">已保存</p>
            <div class="section-actions">
              <button class="btn sm" @click="bgAliases.push({ key: '', value: '' })">+ Add</button>
              <button class="btn primary sm" :disabled="bgSaving" @click="saveBg">
                {{ bgSaving ? '…' : 'Save BG' }}
              </button>
            </div>
            <p class="alias-warning">⚠ 修改别名 key 不会更新引用该别名的场景文件</p>
          </section>

          <!-- Portrait Aliases -->
          <section class="section">
            <h2 class="section-title">PORTRAIT ALIASES</h2>
            <table class="alias-table">
              <tbody>
                <tr v-for="(row, i) in portraitAliases" :key="i">
                  <td><input v-model="row.key" class="alias-input" placeholder="alias" /></td>
                  <td class="arrow-cell">→</td>
                  <td><input v-model="row.value" class="alias-input wide" placeholder="/portraits/…" /></td>
                  <td>
                    <button class="icon-btn" @click="portraitAliases.splice(i, 1)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="portraitError" class="field-error">{{ portraitError }}</p>
            <p v-if="portraitSuccess" class="field-success">已保存</p>
            <div class="section-actions">
              <button class="btn sm" @click="portraitAliases.push({ key: '', value: '' })">+ Add</button>
              <button class="btn primary sm" :disabled="portraitSaving" @click="savePortraits">
                {{ portraitSaving ? '…' : 'Save Portraits' }}
              </button>
            </div>
            <p class="alias-warning">⚠ 修改别名 key 不会更新引用该别名的场景文件</p>
          </section>
        </aside>

        <!-- RIGHT: Decision tree -->
        <main class="tree-col">
          <div class="scenes-header">
            <h2 class="section-title">SCENES</h2>
            <div class="scenes-header-actions">
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
              <template v-for="node in treeLayout.nodes" :key="node.id">
                <div
                  class="tree-node"
                  :class="node.entry.sceneType"
                  :style="{ left: node.x + 'px', top: node.y + 'px' }"
                  @click="openEdit(node.entry)"
                >
                  <div class="node-header">
                    <span class="node-id">{{ node.id }}</span>
                    <span class="scene-badge" :class="node.entry.sceneType">
                      {{ node.entry.sceneType.toUpperCase() }}
                    </span>
                    <button class="icon-btn node-delete" @click.stop="deleteScene(node.entry)" title="删除">✕</button>
                  </div>
                  <p class="node-text">{{ node.entry.scene.text?.slice(0, 55) }}</p>
                  <ul v-if="node.entry.sceneType === 'choice' && node.entry.scene.choices?.length" class="node-choices">
                    <li v-for="(ch, i) in node.entry.scene.choices" :key="i">
                      {{ i + 1 }}. {{ ch.text.slice(0, 16) }}
                    </li>
                  </ul>
                </div>
                <!-- Linear "+" button — shown below terminal linear nodes (no next set) -->
                <button
                  v-if="node.entry.sceneType === 'linear' && !node.entry.scene.next"
                  class="node-add-btn"
                  :style="{ left: node.x + 'px', top: (node.y + 110) + 'px' }"
                  @click.stop="openCreateFromLinear(node.entry)"
                  title="在此节点后新建场景"
                >+</button>
              </template>
            </div>

            <!-- Orphans: scenes not reachable from startSceneId -->
            <div v-if="treeLayout.orphans.length" class="orphans-section">
              <p class="orphans-title">未连接场景</p>
              <div class="orphans-list">
                <div
                  v-for="entry in treeLayout.orphans"
                  :key="entry.scene.id"
                  class="tree-node orphan"
                  @click="openEdit(entry)"
                >
                  <div class="node-header">
                    <span class="node-id">{{ entry.scene.id }}</span>
                    <span class="scene-badge" :class="entry.sceneType">{{ entry.sceneType.toUpperCase() }}</span>
                    <button class="icon-btn node-delete" @click.stop="deleteScene(entry)" title="删除">✕</button>
                  </div>
                  <p class="node-text">{{ entry.scene.text?.slice(0, 55) }}</p>
                </div>
              </div>
            </div>

            <p v-if="treeLayout.nodes.length === 0 && treeLayout.orphans.length === 0" class="state-msg">
              暂无场景
            </p>
          </div>
        </main>
      </div>
    </template>

    <!-- Quick-Create Modal (from choice row "+") -->
    <div v-if="showQuickCreate" class="modal-overlay qc-overlay" @click.self="showQuickCreate = false">
      <div class="modal scene-modal qc-modal">
        <h2 class="modal-title">快速新建场景（choice {{ qcChoiceIdx + 1 }}）</h2>
        <div class="modal-fields">
          <label class="field-label">
            id
            <input v-model="qfId" class="field-input" placeholder="scene_id" />
          </label>
          <label class="field-label">
            background
            <input v-model="qfBackground" class="field-input" :placeholder="`已知别名：${knownBgKeys.join(', ') || '—'}`" />
          </label>
          <label class="field-label">
            portrait
            <input v-model="qfPortrait" class="field-input" :placeholder="`已知别名：${knownPortraitKeys.join(', ') || '—（可为空）'}`" />
          </label>
          <label class="field-label">
            speaker
            <input v-model="qfSpeaker" class="field-input" placeholder="（可为空）" />
          </label>
          <label class="field-label">
            text
            <textarea v-model="qfText" class="field-input" rows="3" placeholder="场景台词…" />
          </label>
        </div>
        <p v-if="qfError" class="field-error">{{ qfError }}</p>
        <div class="modal-actions">
          <button class="btn" @click="showQuickCreate = false">取消</button>
          <button class="btn primary" :disabled="qfSaving" @click="saveQuickCreate">
            {{ qfSaving ? '保存中…' : '创建并链接' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scene Editor Modal -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
      <div class="modal scene-modal">
        <h2 class="modal-title">{{ modalMode === 'create' ? '新建场景' : '编辑场景' }}</h2>

        <div class="modal-fields">
          <label class="field-label">
            id
            <input
              v-model="fId"
              class="field-input"
              placeholder="scene_id"
              :disabled="modalMode === 'edit'"
            />
          </label>

          <label class="field-label">
            background
            <input v-model="fBackground" class="field-input" :placeholder="`已知别名：${knownBgKeys.join(', ') || '—'}`" />
          </label>

          <label class="field-label">
            portrait
            <input v-model="fPortrait" class="field-input" :placeholder="`已知别名：${knownPortraitKeys.join(', ') || '—（可为空）'}`" />
          </label>

          <label class="field-label">
            speaker
            <input v-model="fSpeaker" class="field-input" placeholder="（可为空，使用 defaultSpeaker）" />
          </label>

          <label class="field-label">
            text
            <textarea v-model="fText" class="field-input" rows="4" placeholder="场景台词…" />
          </label>

          <!-- Scene type radio -->
          <fieldset class="type-radio">
            <legend class="field-label-text">场景类型</legend>
            <label class="radio-label">
              <input type="radio" v-model="fType" value="linear" /> Linear
            </label>
            <label class="radio-label">
              <input type="radio" v-model="fType" value="choice" /> Choice
            </label>
            <label class="radio-label">
              <input type="radio" v-model="fType" value="terminal" /> Terminal
            </label>
          </fieldset>

          <!-- next (linear) -->
          <label v-if="fType === 'linear'" class="field-label">
            next
            <select v-model="fNext" class="field-select">
              <option value="">（未设置）</option>
              <option v-for="sid in sceneIds" :key="sid" :value="sid">{{ sid }}</option>
            </select>
          </label>

          <!-- choices (choice) -->
          <div v-if="fType === 'choice'" class="choices-editor">
            <p class="field-label-text">Choices</p>
            <div v-for="(ch, i) in fChoices" :key="i" class="choice-row">
              <input v-model="ch.text" class="field-input choice-text" placeholder="选项文本" />
              <span class="arrow-cell">→</span>
              <select v-model="ch.nextSceneId" class="field-select choice-next">
                <option value="">—</option>
                <option v-for="sid in sceneIds" :key="sid" :value="sid">{{ sid }}</option>
              </select>
              <button class="icon-btn choice-quick-add" @click.prevent="openQuickCreate(i)" title="新建并链接场景">＋</button>
              <input v-model="ch.condition" class="field-input choice-condition" placeholder="条件（可选）" />
              <button class="icon-btn" @click="removeChoice(i)">✕</button>
            </div>
            <button class="btn sm" @click="addChoice">+ Add Choice</button>
          </div>
        </div>

        <p v-if="fError" class="field-error">{{ fError }}</p>

        <div class="modal-actions">
          <button class="btn" @click="modalOpen = false">取消</button>
          <button class="btn primary" :disabled="fSaving" @click="saveScene">
            {{ fSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
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
.nav-link:hover { color: #f0c040; }

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
  width: 38%;
  min-width: 280px;
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

/* Sections */
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

.section-actions {
  display: flex;
  gap: 0.5rem;
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

/* Field components */
.field-label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.field-label-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
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
.field-select:focus { border-color: rgba(240, 192, 64, 0.55); }
.field-input:disabled { opacity: 0.45; cursor: not-allowed; }

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

/* Alias table */
.alias-table {
  border-collapse: collapse;
  width: 100%;
}
.alias-table td { padding: 2px 4px 2px 0; vertical-align: middle; }

.alias-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  color: #f0f0f0;
  padding: 0.3rem 0.5rem;
  font-size: 0.82rem;
  outline: none;
  width: 80px;
  font-family: monospace;
}
.alias-input.wide { width: 140px; }
.alias-input:focus { border-color: rgba(240, 192, 64, 0.5); }

.arrow-cell {
  color: rgba(255, 255, 255, 0.3);
  padding: 0 4px;
  font-size: 0.85rem;
}

.alias-warning {
  font-size: 0.72rem;
  color: rgba(240, 192, 64, 0.45);
  margin: 0;
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

.tree-node {
  position: absolute;
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
.tree-node.linear  { border-left: 3px solid rgba(97, 175, 239, 0.5); }
.tree-node.choice  { border-left: 3px solid rgba(229, 192, 123, 0.5); }
.tree-node.terminal { border-left: 3px solid rgba(152, 195, 121, 0.5); }

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
.tree-node:hover .node-delete { opacity: 1; }

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
.orphans-list .tree-node {
  position: relative;
  left: unset;
  top: unset;
  opacity: 0.65;
  border-style: dashed;
}

.scene-badge {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;
}
.scene-badge.linear { color: #61afef; border-color: rgba(97, 175, 239, 0.4); }
.scene-badge.choice { color: #e5c07b; border-color: rgba(229, 192, 123, 0.4); }
.scene-badge.terminal { color: #98c379; border-color: rgba(152, 195, 121, 0.4); }

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
.btn.sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
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
.btn.danger {
  border-color: rgba(224, 108, 117, 0.35);
  color: #e06c75;
}
.btn.danger:hover:not(:disabled) {
  background: rgba(224, 108, 117, 0.15);
  border-color: #e06c75;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.85rem;
  transition: color 0.2s;
}
.icon-btn:hover { color: #e06c75; }

/* State messages */
.state-msg {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
}
.state-msg.error { color: #e06c75; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  padding: 1rem;
}

.scene-modal {
  background: rgba(12, 14, 24, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1.75rem;
  width: 540px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f0c040;
  margin: 0;
}

.modal-fields {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* Type radio */
.type-radio {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  gap: 1.25rem;
  align-items: center;
}
.type-radio legend { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); padding: 0 0.25rem; }

.radio-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

/* Choices editor */
.choices-editor {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.choice-text { flex: 1.8; }
.choice-next { flex: 1; }
.choice-condition { flex: 1; font-size: 0.8rem; }

.choice-quick-add {
  color: rgba(97, 175, 239, 0.7);
  font-size: 1rem;
  padding: 0 2px;
  flex-shrink: 0;
}
.choice-quick-add:hover { color: #61afef; }

/* Node add button (linear "+") */
.node-add-btn {
  position: absolute;
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

/* Quick-create modal stacks above main modal */
.qc-overlay {
  z-index: 40;
}
.qc-modal {
  width: 420px;
}

.choice-summary {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.choice-summary li {
  font-size: 0.78rem;
  color: rgba(229, 192, 123, 0.75);
}
.choice-summary code {
  font-family: monospace;
  font-size: 0.75rem;
  color: rgba(240, 192, 64, 0.65);
}
.choice-bullet {
  color: rgba(255, 255, 255, 0.3);
  margin-right: 0.25rem;
}
</style>
