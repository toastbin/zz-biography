import { MAX_SAVES } from '@/config/saves'
import type { SaveSlot } from '@/types/save'

const LS_KEY = 'biography_saves'

export function useSaves() {
  function loadAll(): (SaveSlot | null)[] {
    const raw = localStorage.getItem(LS_KEY)
    const data: SaveSlot[] = raw ? (JSON.parse(raw) as SaveSlot[]) : []
    return Array.from({ length: MAX_SAVES }, (_, i) => data.find((s) => s.slotIndex === i) ?? null)
  }

  function save(slot: SaveSlot): void {
    const all = loadAll()
    all[slot.slotIndex] = slot
    localStorage.setItem(LS_KEY, JSON.stringify(all.filter(Boolean)))
  }

  function hasAnySave(): boolean {
    return loadAll().some((s) => s !== null)
  }

  return { loadAll, save, hasAnySave }
}
