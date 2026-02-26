export interface StoryChoice {
  text: string
  nextSceneId: string
  condition?: string
}

/** Runtime scene — all fields fully resolved */
export interface StoryScene {
  id: string
  background: string
  speaker: string | null
  portrait: string | null
  text: string
  next?: string
  choices?: StoryChoice[]
}

export interface CharacterStory {
  id: string
  startSceneId: string
  scenes: Record<string, StoryScene>
}

// ─── JSON file shapes ────────────────────────────────────────────────────────

export interface StoryAssets {
  bg?: Record<string, string>
  portrait?: Record<string, string>
}

/** Shape of public/stories/{id}/index.json */
export interface StoryManifest {
  id: string
  startSceneId: string
  /** Fallback speaker name when a scene omits the speaker field */
  defaultSpeaker?: string
  assets?: StoryAssets
  /** Paths relative to the character directory, e.g. "w_001.json", "past/w_past_001.json" */
  scenes: string[]
}

/**
 * Raw scene as written in JSON — background/portrait may be asset aliases,
 * speaker may be omitted (inherits defaultSpeaker).
 */
export interface RawStoryScene {
  id: string
  background: string
  speaker?: string | null
  portrait?: string | null
  text: string
  next?: string
  choices?: StoryChoice[]
}
