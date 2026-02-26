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

const route = useRoute()
const router = useRouter()

const story = ref<CharacterStory | null>(null)
const currentScene = ref<StoryScene | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const hasChoices = computed(
  () => !!currentScene.value?.choices && currentScene.value.choices.length > 0,
)
const isTerminal = computed(
  () => !currentScene.value?.next && !hasChoices.value,
)

onMounted(async () => {
  const characterId = route.params.characterId as string
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
    currentScene.value = data.scenes[data.startSceneId] ?? null
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
    currentScene.value = story.value.scenes[next] ?? null
  }
}

function choose(choice: StoryChoice) {
  if (!story.value) return
  currentScene.value = story.value.scenes[choice.nextSceneId] ?? null
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

      <ChoicePanel v-if="hasChoices" :choices="currentScene.choices!" @choose="choose" />

      <DialogueBox
        :speaker="currentScene.speaker"
        :text="currentScene.text"
        :is-terminal="isTerminal"
        @advance="advance"
      />

      <button v-if="isTerminal" class="back-button terminal" @click="goBack">返回选择</button>
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
</style>
