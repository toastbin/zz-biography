import type { Plugin } from 'vite'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { StoryManifest, RawStoryScene } from '../src/types/story'

// ─── helpers ─────────────────────────────────────────────────────────────────

function safeResolve(root: string, ...segments: string[]): string | null {
  const resolved = path.resolve(root, ...segments)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null
  return resolved
}

function atomicWrite(filePath: string, data: unknown): void {
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

function readJSON<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function deriveRelPath(sceneId: string, origins: Set<string>): string {
  if (origins.size === 0) return `${sceneId}.json`
  if (origins.size === 1) {
    const [origin] = origins
    // origin is "{decisionPointId}_c{n}" — strip the trailing "_c{n}"
    const decisionPointId = origin.replace(/_c\d+$/, '')
    return `${decisionPointId}_${sceneId}.json`
  }
  // Reachable from multiple branches → stays at root
  return `${sceneId}.json`
}

function deriveSceneType(scene: RawStoryScene): 'linear' | 'choice' | 'terminal' {
  if (scene.choices && scene.choices.length > 0) return 'choice'
  if (scene.next) return 'linear'
  return 'terminal'
}

// ─── plugin ──────────────────────────────────────────────────────────────────

export function adminPlugin(): Plugin {
  return {
    name: 'vite-plugin-admin',
    apply: 'serve',
    configureServer(server) {
      const STORIES_ROOT = path.resolve(server.config.root, 'public/stories')

      server.middlewares.use('/api/admin', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const method = req.method ?? 'GET'
        const url = req.url ?? '/'

        // Strip query string
        const pathname = url.split('?')[0]

        try {
          // GET /api/admin/stories
          if (method === 'GET' && pathname === '/stories') {
            if (!fs.existsSync(STORIES_ROOT)) {
              return json(res, 200, [])
            }
            const dirs = fs.readdirSync(STORIES_ROOT, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name)

            const result = dirs.map(id => {
              const manifestPath = path.join(STORIES_ROOT, id, 'index.json')
              const hasManifest = fs.existsSync(manifestPath)
              let sceneCount = 0
              if (hasManifest) {
                try {
                  const manifest = readJSON<StoryManifest>(manifestPath)
                  sceneCount = manifest.scenes?.length ?? 0
                } catch { /* skip */ }
              }
              return { id, hasManifest, sceneCount }
            })
            return json(res, 200, result)
          }

          // POST /api/admin/stories/:id  (create new character dir)
          const createMatch = pathname.match(/^\/stories\/([^/]+)$/)
          if (method === 'POST' && createMatch) {
            const id = createMatch[1]
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            if (fs.existsSync(charDir)) {
              return json(res, 409, { error: 'Character already exists' })
            }
            fs.mkdirSync(charDir, { recursive: true })
            const manifest: StoryManifest = { id, startSceneId: '', scenes: [] }
            atomicWrite(path.join(charDir, 'index.json'), manifest)
            return json(res, 201, { id, hasManifest: true, sceneCount: 0 })
          }

          // GET /api/admin/stories/:id
          const storyMatch = pathname.match(/^\/stories\/([^/]+)$/)
          if (method === 'GET' && storyMatch) {
            const id = storyMatch[1]
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir || !fs.existsSync(charDir)) return json(res, 404, { error: 'Not found' })

            const manifestPath = path.join(charDir, 'index.json')
            if (!fs.existsSync(manifestPath)) return json(res, 404, { error: 'No manifest' })

            const manifest = readJSON<StoryManifest>(manifestPath)
            const scenes = manifest.scenes.map(relPath => {
              const scenePath = safeResolve(charDir, relPath)
              if (!scenePath || !fs.existsSync(scenePath)) return null
              try {
                const scene = readJSON<RawStoryScene>(scenePath)
                return { filePath: relPath, scene, sceneType: deriveSceneType(scene) }
              } catch { return null }
            }).filter(Boolean)

            return json(res, 200, { manifest, scenes })
          }

          // PUT /api/admin/stories/:id/manifest
          const manifestMatch = pathname.match(/^\/stories\/([^/]+)\/manifest$/)
          if (method === 'PUT' && manifestMatch) {
            const id = manifestMatch[1]
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            const manifestPath = path.join(charDir, 'index.json')
            if (!fs.existsSync(manifestPath)) return json(res, 404, { error: 'Not found' })

            const existing = readJSON<StoryManifest>(manifestPath)
            const updates = await readBody(req) as Partial<StoryManifest>

            const merged: StoryManifest = {
              ...existing,
              ...(updates.defaultSpeaker !== undefined ? { defaultSpeaker: updates.defaultSpeaker } : {}),
              ...(updates.startSceneId !== undefined ? { startSceneId: updates.startSceneId } : {}),
              ...(updates.assets !== undefined ? { assets: updates.assets } : {}),
              ...(updates.scenes !== undefined ? { scenes: updates.scenes } : {}),
            }
            atomicWrite(manifestPath, merged)
            return json(res, 200, merged)
          }

          // POST /api/admin/stories/:id/scenes
          const scenesMatch = pathname.match(/^\/stories\/([^/]+)\/scenes$/)
          if (method === 'POST' && scenesMatch) {
            const id = scenesMatch[1]
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            const manifestPath = path.join(charDir, 'index.json')
            if (!fs.existsSync(manifestPath)) return json(res, 404, { error: 'No manifest' })

            const body = await readBody(req) as RawStoryScene & { prefix?: string }
            const prefix = typeof body.prefix === 'string' ? body.prefix : ''
            // Remove prefix from scene data before saving
            const { prefix: _prefix, ...scene } = body as RawStoryScene & { prefix?: string }
            void _prefix

            if (!scene.id || !/^[\w-]+$/.test(scene.id)) {
              return json(res, 400, { error: 'Invalid scene id' })
            }

            const filename = prefix ? `${prefix}${scene.id}.json` : `${scene.id}.json`
            const relPath = filename
            const scenePath = safeResolve(charDir, relPath)
            if (!scenePath) return json(res, 403, { error: 'Invalid path' })

            fs.mkdirSync(path.dirname(scenePath), { recursive: true })
            atomicWrite(scenePath, scene)

            // Append to manifest scenes[]
            const manifest = readJSON<StoryManifest>(manifestPath)
            if (!manifest.scenes.includes(relPath)) {
              manifest.scenes.push(relPath)
              atomicWrite(manifestPath, manifest)
            }

            return json(res, 201, { filePath: relPath, scene, sceneType: deriveSceneType(scene) })
          }

          // POST /api/admin/stories/:id/normalize-names
          const normalizeMatch = pathname.match(/^\/stories\/([^/]+)\/normalize-names$/)
          if (method === 'POST' && normalizeMatch) {
            const id = normalizeMatch[1]
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            const manifestPath = path.join(charDir, 'index.json')
            if (!fs.existsSync(manifestPath)) return json(res, 404, { error: 'No manifest' })

            const manifest = readJSON<StoryManifest>(manifestPath)
            if (!manifest.startSceneId) return json(res, 400, { error: 'No startSceneId set' })

            // Load all scenes keyed by relPath
            const sceneDataMap = new Map<string, RawStoryScene>()
            for (const relPath of manifest.scenes) {
              const scenePath = safeResolve(charDir, relPath)
              if (!scenePath || !fs.existsSync(scenePath)) continue
              try {
                sceneDataMap.set(relPath, readJSON<RawStoryScene>(scenePath))
              } catch { /* skip */ }
            }

            // Build id→relPath map
            const idToRelPath = new Map<string, string>()
            for (const [relPath, scene] of sceneDataMap) {
              idToRelPath.set(scene.id, relPath)
            }

            // BFS to compute per-scene origins: which choice branches (c1/, c2/, …) can reach it.
            // Rules:
            //   start scene            → origins = {} (root linear)
            //   scene.next → nextId    → merge currentOrigins into nextId's origins
            //   choices[i] → nextId    → add "c{i+1}/" to nextId's origins
            // Use `queued` (not `visited`) so already-queued nodes still receive origin updates.
            const originsMap = new Map<string, Set<string>>() // sceneId → Set<branch origin>
            const queued = new Set<string>()
            const queue: string[] = [manifest.startSceneId]
            originsMap.set(manifest.startSceneId, new Set())
            queued.add(manifest.startSceneId)

            while (queue.length) {
              const currentId = queue.shift()!
              const currentRelPath = idToRelPath.get(currentId)
              if (!currentRelPath) continue
              const currentScene = sceneDataMap.get(currentRelPath)
              if (!currentScene) continue

              const currentOrigins = originsMap.get(currentId)!

              // Linear successor inherits all current origins
              if (currentScene.next) {
                const nextId = currentScene.next
                if (!originsMap.has(nextId)) originsMap.set(nextId, new Set())
                const nextOrigins = originsMap.get(nextId)!
                for (const o of currentOrigins) nextOrigins.add(o)
                if (!queued.has(nextId)) { queued.add(nextId); queue.push(nextId) }
              }

              // Choice successors each gain c{i+1}/ as an origin
              if (currentScene.choices) {
                for (let i = 0; i < currentScene.choices.length; i++) {
                  const nextId = currentScene.choices[i].nextSceneId
                  if (!nextId) continue
                  if (!originsMap.has(nextId)) originsMap.set(nextId, new Set())
                  originsMap.get(nextId)!.add(`${currentId}_c${i + 1}`)
                  if (!queued.has(nextId)) { queued.add(nextId); queue.push(nextId) }
                }
              }
            }

            // Build rename map: oldRelPath → newRelPath
            const renameMap = new Map<string, string>()
            for (const [sceneId, origins] of originsMap) {
              const oldRelPath = idToRelPath.get(sceneId)
              if (!oldRelPath) continue
              const newRelPath = deriveRelPath(sceneId, origins)
              if (oldRelPath !== newRelPath) renameMap.set(oldRelPath, newRelPath)
            }

            const renamed: Array<{ from: string; to: string }> = []
            const unchanged: string[] = []

            // Perform renames
            for (const [oldRelPath, newRelPath] of renameMap) {
              const oldAbsPath = safeResolve(charDir, oldRelPath)
              const newAbsPath = safeResolve(charDir, newRelPath)
              if (!oldAbsPath || !newAbsPath) continue
              const scene = sceneDataMap.get(oldRelPath)
              if (!scene) continue
              fs.mkdirSync(path.dirname(newAbsPath), { recursive: true })
              atomicWrite(newAbsPath, scene)
              fs.unlinkSync(oldAbsPath)
              // Clean up empty subdirectory
              const oldDir = path.dirname(oldAbsPath)
              if (oldDir !== charDir && fs.existsSync(oldDir)) {
                try {
                  const remaining = fs.readdirSync(oldDir)
                  if (remaining.length === 0) fs.rmdirSync(oldDir)
                } catch { /* ignore */ }
              }
              renamed.push({ from: oldRelPath, to: newRelPath })
            }

            // Track unchanged
            for (const relPath of manifest.scenes) {
              if (!renameMap.has(relPath)) unchanged.push(relPath)
            }

            // Update manifest.scenes[] with new paths
            const updatedScenes = manifest.scenes.map(relPath => renameMap.get(relPath) ?? relPath)
            manifest.scenes = updatedScenes
            atomicWrite(manifestPath, manifest)

            return json(res, 200, { renamed, unchanged })
          }

          // PUT /api/admin/stories/:id/scenes/:encodedPath
          const scenePathMatch = pathname.match(/^\/stories\/([^/]+)\/scenes\/(.+)$/)
          if (method === 'PUT' && scenePathMatch) {
            const id = scenePathMatch[1]
            const relPath = decodeURIComponent(scenePathMatch[2])
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            const scenePath = safeResolve(charDir, relPath)
            if (!scenePath) return json(res, 403, { error: 'Path traversal rejected' })

            if (!fs.existsSync(scenePath)) return json(res, 404, { error: 'Scene not found' })

            const scene = await readBody(req) as RawStoryScene
            atomicWrite(scenePath, scene)
            return json(res, 200, { filePath: relPath, scene, sceneType: deriveSceneType(scene) })
          }

          // DELETE /api/admin/stories/:id/scenes/:encodedPath
          if (method === 'DELETE' && scenePathMatch) {
            const id = scenePathMatch[1]
            const relPath = decodeURIComponent(scenePathMatch[2])
            const charDir = safeResolve(STORIES_ROOT, id)
            if (!charDir) return json(res, 403, { error: 'Invalid path' })

            const scenePath = safeResolve(charDir, relPath)
            if (!scenePath) return json(res, 403, { error: 'Path traversal rejected' })

            if (!fs.existsSync(scenePath)) return json(res, 404, { error: 'Scene not found' })

            fs.unlinkSync(scenePath)

            // Remove from manifest scenes[]
            const manifestPath = path.join(charDir, 'index.json')
            if (fs.existsSync(manifestPath)) {
              const manifest = readJSON<StoryManifest>(manifestPath)
              manifest.scenes = manifest.scenes.filter(s => s !== relPath)
              atomicWrite(manifestPath, manifest)
            }

            return json(res, 200, { deleted: relPath })
          }

          next()
        } catch (err) {
          console.error('[admin-plugin]', err)
          json(res, 500, { error: String(err) })
        }
      })
    },
  }
}
