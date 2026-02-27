import type { StoryScene } from './story'

export interface TreeBranch {
  text: string
  nextSceneId: string
  taken: boolean
  subtree: TreeNode | null
}

export interface TreeNode {
  scene: StoryScene
  visited: boolean
  isCurrent: boolean
  branches: TreeBranch[]
  child: TreeNode | null
}
