import { ref, readonly } from 'vue'
import type { Ref } from 'vue'
import type { NpcDefinition, StoryChoice } from '@/types/story'

export interface AppliedDiff {
  npcId: string
  npcName: string
  delta: number
  newValue: number
}

const affinityMap = ref<Record<string, number>>({})
let npcDefs: NpcDefinition[] = []
let currentCharId = ''

function lsKey(characterId: string) {
  return `biography_affinity_${characterId}`
}

function persist() {
  localStorage.setItem(lsKey(currentCharId), JSON.stringify(affinityMap.value))
}

function initAffinity(characterId: string, npcs: NpcDefinition[]) {
  currentCharId = characterId
  npcDefs = npcs

  const saved = localStorage.getItem(lsKey(characterId))
  const savedMap: Record<string, number> = saved ? (JSON.parse(saved) as Record<string, number>) : {}

  const merged: Record<string, number> = {}
  for (const npc of npcs) {
    merged[npc.id] = savedMap[npc.id] ?? npc.initialAffinity
  }
  affinityMap.value = merged
  persist()
}

function applyEffects(effects: NonNullable<StoryChoice['affinityEffects']>): AppliedDiff[] {
  const diffs: AppliedDiff[] = []
  for (const effect of effects) {
    const current = affinityMap.value[effect.npcId] ?? 0
    const newValue = current + effect.delta
    affinityMap.value = { ...affinityMap.value, [effect.npcId]: newValue }
    diffs.push({
      npcId: effect.npcId,
      npcName: getNpcName(effect.npcId),
      delta: effect.delta,
      newValue,
    })
  }
  persist()
  return diffs
}

function isChoiceUnlocked(choice: StoryChoice): boolean {
  if (!choice.affinityCondition) return true
  const { npcId, minValue } = choice.affinityCondition
  return (affinityMap.value[npcId] ?? 0) >= minValue
}

function getNpcName(npcId: string): string {
  return npcDefs.find(n => n.id === npcId)?.name ?? npcId
}

function loadSnapshot(characterId: string, snapshot: Record<string, number>) {
  currentCharId = characterId
  affinityMap.value = { ...snapshot }
  persist()
}

function getSnapshot(): Record<string, number> {
  return { ...affinityMap.value }
}

function resetAffinity() {
  const merged: Record<string, number> = {}
  for (const npc of npcDefs) {
    merged[npc.id] = npc.initialAffinity
  }
  affinityMap.value = merged
  persist()
}

export function useAffinity() {
  return {
    affinityMap: readonly(affinityMap) as Readonly<Ref<Record<string, number>>>,
    initAffinity,
    applyEffects,
    isChoiceUnlocked,
    getNpcName,
    loadSnapshot,
    getSnapshot,
    resetAffinity,
  }
}
