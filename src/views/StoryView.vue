<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type {
  CharacterStory,
  StoryScene,
  StoryChoice,
  StoryManifest,
  RawStoryScene,
} from '@/types/story'
import SceneBackground from '@/components/SceneBackground.vue'
import CharacterPortrait from '@/components/CharacterPortrait.vue'
import DialogueBox from '@/components/DialogueBox.vue'
import ChoicePanel from '@/components/ChoicePanel.vue'
import GameMenu from '@/components/GameMenu.vue'
import DecisionTreeView from '@/components/DecisionTreeView.vue'
import SaveDialog from '@/components/SaveDialog.vue'
import { useSaves } from '@/composables/useSaves'

const route = useRoute()
const router = useRouter()

const characterId = route.params.characterId as string
const LS_PATH = `biography_path_${characterId}`
const LS_CHOICES = `biography_choices_${characterId}`

const story = ref<CharacterStory | null>(null)
const currentScene = ref<StoryScene | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const visitedPath = ref<string[]>([])
const choicesTaken = ref<Record<string, number>>({})

const showMenu = ref(false)
const showTree = ref(false)
const showSave = ref(false)

const defaultSaveName = computed(() => {
  const text = currentScene.value?.text ?? ''
  return text.length > 10 ? text.slice(0, 10) + '…' : text
})

const hasChoices = computed(
  () => !!currentScene.value?.choices && currentScene.value.choices.length > 0,
)
const isTerminal = computed(
  () => !currentScene.value?.next && !hasChoices.value,
)

function saveProgress() {
  localStorage.setItem(LS_PATH, JSON.stringify(visitedPath.value))
  localStorage.setItem(LS_CHOICES, JSON.stringify(choicesTaken.value))
}

function loadProgress(startSceneId: string) {
  const savedPath = localStorage.getItem(LS_PATH)
  const savedChoices = localStorage.getItem(LS_CHOICES)
  if (savedPath) {
    visitedPath.value = JSON.parse(savedPath) as string[]
    choicesTaken.value = savedChoices ? (JSON.parse(savedChoices) as Record<string, number>) : {}
  } else {
    visitedPath.value = [startSceneId]
    choicesTaken.value = {}
  }
}

onMounted(async () => {
  const base = `/stories/${characterId}`
  try {
    const manifestRes = await fetch(`${base}/index.json`)
    if (!manifestRes.ok) throw new Error(`无法加载故事索引 (${manifestRes.status})`)
    const manifest: StoryManifest = await manifestRes.json()

    const rawList = await Promise.all(
      manifest.scenes.map(async (path) => {
        const res = await fetch(`${base}/${path}`)
        if (!res.ok) throw new Error(`无法加载场景文件: ${path}`)
        return res.json() as Promise<RawStoryScene>
      }),
    )

    const scenes: Record<string, StoryScene> = {}
    for (const raw of rawList) scenes[raw.id] = resolveScene(raw, manifest)

    const data: CharacterStory = { id: manifest.id, startSceneId: manifest.startSceneId, scenes }
    story.value = data

    const slotQuery = route.query.slot
    if (slotQuery !== undefined) {
      const { loadAll } = useSaves()
      const slotIndex = parseInt(slotQuery as string, 10)
      const namedSlot = loadAll()[slotIndex]
      if (namedSlot) {
        visitedPath.value = namedSlot.visitedPath
        choicesTaken.value = namedSlot.choicesTaken
        saveProgress()
      } else {
        loadProgress(data.startSceneId)
      }
    } else if (route.query.fresh === '1') {
      visitedPath.value = [data.startSceneId]
      choicesTaken.value = {}
      saveProgress()
    } else {
      loadProgress(data.startSceneId)
    }

    const path = visitedPath.value
    const lastSceneId = path.length > 0 ? path[path.length - 1] : undefined
    currentScene.value =
      (lastSceneId ? data.scenes[lastSceneId] : null) ?? data.scenes[data.startSceneId] ?? null
  } catch (e) {
    error.value = e instanceof Error ? e.message : '未知错误'
  } finally {
    isLoading.value = false
  }
})

function advance() {
  if (!currentScene.value || hasChoices.value || isTerminal.value) return
  const next = currentScene.value.next
  if (next && story.value) {
    if (!visitedPath.value.includes(next)) visitedPath.value.push(next)
    currentScene.value = story.value.scenes[next] ?? null
    saveProgress()
  }
}

function choose(choice: StoryChoice, index: number) {
  if (!story.value || !currentScene.value) return
  const currentId = currentScene.value.id
  choicesTaken.value[currentId] = index
  visitedPath.value.push(choice.nextSceneId)
  currentScene.value = story.value.scenes[choice.nextSceneId] ?? null
  saveProgress()
}

function rewindTo(sceneId: string) {
  const idx = visitedPath.value.indexOf(sceneId)
  if (idx < 0 || !story.value) return
  const removed = visitedPath.value.splice(idx + 1)
  removed.forEach((id) => delete choicesTaken.value[id])
  delete choicesTaken.value[sceneId]
  currentScene.value = story.value.scenes[sceneId] ?? null
  saveProgress()
  showMenu.value = false
  showTree.value = false
  showSave.value = false
}

function resolveScene(raw: RawStoryScene, manifest: StoryManifest): StoryScene {
  const bg = raw.background
  const por = raw.portrait ?? null
  return {
    id: raw.id,
    background: manifest.assets?.bg?.[bg] ?? bg,
    speaker: 'speaker' in raw ? (raw.speaker ?? null) : (manifest.defaultSpeaker ?? null),
    portrait: por !== null ? (manifest.assets?.portrait?.[por] ?? por) : null,
    text: raw.text,
    next: raw.next,
    choices: raw.choices,
  }
}

function goBack() {
  router.push('/select')
}
</script>

<template>
  <div class="story-view">
    <div v-if="isLoading" class="overlay-message">加载中……</div>
    <div v-else-if="error" class="overlay-message error">
      {{ error }}
      <button class="back-button" @click="goBack">返回选择</button>
    </div>

    <template v-else-if="currentScene">
      <SceneBackground :src="currentScene.background" />
      <CharacterPortrait :src="currentScene.portrait" />

      <ChoicePanel
        v-if="hasChoices"
        :choices="currentScene.choices!"
        @choose="(c, i) => choose(c, i)"
      />

      <DialogueBox
        :speaker="currentScene.speaker"
        :text="currentScene.text"
        :is-terminal="isTerminal"
        @advance="advance"
      />

      <button v-if="isTerminal" class="back-button terminal" @click="goBack">返回选择</button>

      <!-- Menu trigger -->
      <button class="menu-btn" @click="showMenu = true">≡</button>

      <!-- Menu panel -->
      <GameMenu
        v-if="showMenu"
        @close="showMenu = false"
        @show-tree="showTree = true; showMenu = false"
        @save="showSave = true; showMenu = false"
        @home="router.push('/')"
      />

      <!-- Decision tree panel -->
      <DecisionTreeView
        v-if="showTree && story"
        :story="story"
        :visited-path="visitedPath"
        :choices-taken="choicesTaken"
        @rewind="rewindTo"
        @close="showTree = false"
      />

      <!-- Save dialog -->
      <SaveDialog
        v-if="showSave"
        :character-id="characterId"
        :visited-path="visitedPath"
        :choices-taken="choicesTaken"
        :default-name="defaultSaveName"
        @close="showSave = false"
      />
    </template>
  </div>
</template>

<style scoped>
.story-view {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
}

.overlay-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #f0f0f0;
  font-size: 1.2rem;
  gap: 1.5rem;
  z-index: 10;
}

.overlay-message.error {
  color: #f87171;
}

.back-button {
  background: rgba(10, 10, 20, 0.88);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.back-button:hover {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
  color: #f0c040;
}

.back-button.terminal {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
}

.menu-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(10, 10, 20, 0.75);
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  width: 2.4rem;
  height: 2.4rem;
  font-size: 1.3rem;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.menu-btn:hover {
  background: rgba(240, 192, 64, 0.2);
  border-color: #f0c040;
  color: #f0c040;
}
</style>
