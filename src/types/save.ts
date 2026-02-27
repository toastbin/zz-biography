export interface SaveSlot {
  slotIndex: number
  name: string
  characterId: string
  visitedPath: string[]
  choicesTaken: Record<string, number>
  savedAt: number
}
