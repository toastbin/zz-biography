import type { StoryManifest, RawStoryScene, StoryAssets } from '@/types/story'

export interface SceneEntry {
  filePath: string
  scene: RawStoryScene
  sceneType: 'linear' | 'choice' | 'terminal'
}

export interface AdminStoryPayload {
  manifest: StoryManifest
  scenes: SceneEntry[]
}

export interface CharacterSummary {
  id: string
  hasManifest: boolean
  sceneCount: number
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export function useAdminApi() {
  function listCharacters(): Promise<CharacterSummary[]> {
    return apiFetch('/api/admin/stories')
  }

  function getStory(id: string): Promise<AdminStoryPayload> {
    return apiFetch(`/api/admin/stories/${encodeURIComponent(id)}`)
  }

  function updateManifest(
    id: string,
    updates: { defaultSpeaker?: string; startSceneId?: string; assets?: StoryAssets },
  ): Promise<StoryManifest> {
    return apiFetch(`/api/admin/stories/${encodeURIComponent(id)}/manifest`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  function createScene(id: string, scene: RawStoryScene, prefix?: string): Promise<SceneEntry> {
    const body = prefix ? { ...scene, prefix } : scene
    return apiFetch(`/api/admin/stories/${encodeURIComponent(id)}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  function normalizeNames(id: string): Promise<{ renamed: { from: string; to: string }[]; unchanged: string[] }> {
    return apiFetch(`/api/admin/stories/${encodeURIComponent(id)}/normalize-names`, { method: 'POST' })
  }

  function updateScene(id: string, filePath: string, scene: RawStoryScene): Promise<SceneEntry> {
    return apiFetch(
      `/api/admin/stories/${encodeURIComponent(id)}/scenes/${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene),
      },
    )
  }

  function deleteScene(id: string, filePath: string): Promise<{ deleted: string }> {
    return apiFetch(
      `/api/admin/stories/${encodeURIComponent(id)}/scenes/${encodeURIComponent(filePath)}`,
      { method: 'DELETE' },
    )
  }

  function createCharacter(id: string): Promise<CharacterSummary> {
    return apiFetch(`/api/admin/stories/${encodeURIComponent(id)}`, { method: 'POST' })
  }

  return { listCharacters, getStory, updateManifest, createScene, updateScene, deleteScene, createCharacter, normalizeNames }
}
