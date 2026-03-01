# zz传记 — 产品文档

> 当前版本基于 Vue 3.5 + TypeScript 5.9 + Vite，纯前端运行，无后端依赖。

---

## 一、产品概述

**zz传记** 是一款运行在浏览器中的分支叙事（Visual Novel）互动阅读应用。玩家选择角色后进入该角色的故事，通过阅读对话、做出选择推进剧情，并可随时存档/读档、查看决策树并回溯至任意历史节点。

**核心价值：**
- 沉浸式角色故事体验
- 有意义的选择 → 分支结局
- 零后端：所有数据静态托管，状态存于 localStorage
- 低门槛扩展：新角色/新场景只需添加 JSON 文件

---

## 二、功能模块

### 2.1 主菜单（`/`）

入口页面，深色星空渐变背景，金色标题"zz传记"。

| 按钮 | 行为 |
|------|------|
| 新的开始 | 导航至角色选择页 `/select` |
| 读取存档 | 检查 localStorage 是否有存档；有则打开存档列表覆盖层；无则按钮置灰不可点 |

存档列表（`SaveSlotList`）：仅显示已有存档的槽位，点击即恢复该存档并进入对应角色故事。

---

### 2.2 角色选择（`/select`）

展示全部可选角色卡片网格（`CharacterCard`）。

**当前角色：**

| 角色 ID | 名称 | 头像 | 简介 |
|---------|------|------|------|
| `warrior` | 战士 | ⚔️ | 勇猛无畏的近战英雄，擅长剑盾，冲锋陷阵 |
| `mage` | 法师 | 🔮 | 精通元素魔法的神秘施法者，可召唤强大法术 |
| `ranger` | 游侠 | 🏹 | 敏捷的远程射手，与自然为伴，善于追踪狩猎 |

**交互逻辑：**
1. 默认无选中，"确认选择"按钮置灰
2. 点击卡片 → 高亮选中，记录 `selectedCharacter`
3. 点击"确认选择" → 跳转 `/story/:characterId?fresh=1`，强制从头开始

---

### 2.3 故事阅读（`/story/:characterId`）

主游戏页面，由 `StoryView.vue` 统一编排所有游戏状态。

#### 场景层（stateless，纯 props 驱动）

| 组件 | 职责 |
|------|------|
| `SceneBackground` | 全屏背景图，`src` 来自资源别名解析 |
| `CharacterPortrait` | 角色立绘层，`src` 为 null 时不显示 |
| `DialogueBox` | 对话面板，显示说话人 + 文本；终结场景时改为"返回选择"按钮 |
| `ChoicePanel` | 分支选项按钮组，玩家点击后触发 `choose` 事件 |

#### 场景推进逻辑

| 操作 | 触发 | 效果 |
|------|------|------|
| 点击对话框 | `DialogueBox` emit `advance` | 跳到 `scene.next`，追加到 `visitedPath` |
| 点击选项 | `ChoicePanel` emit `choose` | 记录 `choicesTaken[sceneId] = index`，跳到选项的 `nextSceneId` |
| 点击"返回选择" | 终结场景 | 导航回 `/select` |
| 决策树回溯 | `DecisionTreeNode` emit `rewind` | 截断 `visitedPath`，清除截断后的选择记录，跳回目标场景 |

#### 路由参数

| 参数 | 效果 |
|------|------|
| `?fresh=1` | 忽略 auto-save，从 `startSceneId` 重新开始 |
| `?slot=N` | 从 `biography_saves[N]` 恢复存档（visitedPath + choicesTaken） |

---

### 2.4 存档系统

两级存储，均写入 `localStorage`：

#### Auto-save（自动）

每次场景变化后立即写入，无需玩家操作：

| 键名 | 内容 |
|------|------|
| `biography_path_{characterId}` | `string[]`，已访问的场景 ID 序列 |
| `biography_choices_{characterId}` | `Record<string, number>`，每个分支场景的选择索引 |

打开游戏时若无 `?fresh=1`/`?slot=N`，自动从 auto-save 恢复上次进度。

#### 命名存档（玩家手动）

键名 `biography_saves`，存储上限 **20 个槽位**（`MAX_SAVES`，可在 `src/config/saves.ts` 修改）。

`SaveSlot` 数据结构：

```typescript
{
  slotIndex: number                     // 0-based 槽位序号
  name: string                          // 玩家自定义标签
  characterId: string
  visitedPath: string[]
  choicesTaken: Record<string, number>
  savedAt: number                       // Date.now() 时间戳
}
```

**存档 UI：**
- `SaveDialog`（游戏内）：20 个槽位全部展示；点击槽位后可内联编辑名称，确认写入
- `SaveSlotList`（主菜单）：仅展示已有存档槽位，点击直接读取

---

### 2.5 游戏内菜单

右上角固定 `≡` 按钮（z-index 10）打开 `GameMenu`，提供四项操作：

| 菜单项 | 效果 |
|--------|------|
| 决策树 | 打开全屏决策树覆盖层 |
| 存档 | 打开存档对话框 |
| 返回主菜单 | `router.push('/')` |
| 关闭 | 收起菜单 |

---

### 2.6 决策树

`DecisionTreeView` 将玩家已走过的路径和所有分支渲染为**横向卡片树**，支持任意节点回溯。

#### 节点状态

| 视觉样式 | 含义 | 交互 |
|----------|------|------|
| 金色边框 `◆ 当前` | 当前所在场景 | 无 |
| `↩ 点击回溯` | 已访问场景 | 点击 → 回溯到该节点 |
| 40% 透明度 `○ 未到达` | 存在但未访问 | 无 |
| 幽灵卡片 `❓` | 未走过的分支末端 | 无 |

#### 回溯流程

```
点击已访问节点
↓
rewindTo(sceneId)
  visitedPath 截断到目标节点（不含之后）
  删除截断部分的 choicesTaken 记录
  删除目标节点自身的 choicesTaken（允许重新选择）
  切换到目标场景
  saveProgress()
  关闭所有覆盖层
```

---

## 三、故事数据

故事数据全部静态托管在 `public/stories/{characterId}/`，运行时通过 `fetch()` 加载。

### 目录结构

```
public/stories/
├── warrior/
│   ├── index.json              ← manifest（必须）
│   ├── w_001.json              ← 线性场景
│   ├── w_002.json              ← 分支点
│   ├── past/                   ← 分支子目录
│   │   ├── w_past_001.json
│   │   └── w_past_002.json
│   ├── mission/
│   │   └── w_mission_001.json
│   └── w_end.json              ← 终结场景
├── mage/
│   ├── index.json
│   ├── m_001.json
│   ├── m_002.json
│   ├── magic/
│   │   ├── m_magic_001.json
│   │   └── m_magic_002.json
│   ├── quest/
│   │   └── m_quest_001.json
│   └── m_end.json
└── ranger/
    ├── index.json
    ├── r_001.json
    ├── r_002.json
    ├── guide/
    │   ├── r_guide_001.json
    │   └── r_guide_002.json
    ├── threat/
    │   └── r_threat_001.json
    └── r_end.json
```

### 场景 JSON 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 场景唯一 ID |
| `background` | `string` | 背景别名（来自 `assets.bg`）|
| `speaker` | `string \| null \| 省略` | 省略继承 `defaultSpeaker`；`null` 表示旁白 |
| `portrait` | `string \| null \| 省略` | 立绘别名；`null`/省略不显示立绘 |
| `text` | `string` | 对话/旁白文本 |
| `next` | `string?` | 线性推进：下一场景 ID |
| `choices` | `StoryChoice[]?` | 分支：选项列表，与 `next` 二选一 |

`next` 与 `choices` 均缺失时，该场景为**终结场景**。

---

## 四、运行时加载流程

```
StoryView 挂载
  └─ fetch /stories/{id}/index.json         ← 获取 manifest
        └─ Promise.all(scenes.map(fetch))   ← 并行获取所有场景文件
              └─ 按 scene.id 组装为 Record<string, StoryScene>
                    └─ 解析 ?fresh / ?slot 参数
                          └─ 渲染首个场景
```

---

## 五、技术架构

```
src/
├── main.ts                ← 创建 Vue 应用并挂载
├── App.vue                ← 根组件，仅含 <RouterView />
├── router/index.ts        ← 3 条路由
├── views/
│   ├── HomeView.vue       ← 主菜单页
│   ├── CharacterSelect.vue← 角色选择页
│   └── StoryView.vue      ← 游戏主页面（持有全部游戏状态）
├── components/
│   ├── SceneBackground.vue
│   ├── CharacterPortrait.vue
│   ├── DialogueBox.vue
│   ├── ChoicePanel.vue
│   ├── GameMenu.vue
│   ├── DecisionTreeView.vue
│   ├── DecisionTreeNode.vue   ← 递归组件
│   ├── SaveDialog.vue
│   └── SaveSlotList.vue
├── composables/
│   └── useSaves.ts        ← loadAll / save / hasAnySave
├── config/
│   └── saves.ts           ← MAX_SAVES = 20
├── data/
│   └── characters.ts      ← 角色注册表
├── types/
│   ├── character.ts
│   ├── story.ts
│   ├── save.ts
│   └── tree.ts
└── styles/
    └── main.css           ← 全局 CSS 变量与 reset
```

**路由表：**

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `HomeView` | 主菜单 |
| `/select` | `CharacterSelect` | 角色选择 |
| `/story/:characterId` | `StoryView` | 故事阅读 |

---

## 六、如何扩展

### 新增角色

1. 在 `public/stories/` 下建 `{id}/` 目录
2. 创建 `index.json`（manifest）
3. 按场景规范建场景 JSON 文件
4. 在 `src/data/characters.ts` 添加角色记录

其余代码无需改动，路由和 `StoryView` 完全通用。

### 修改存档槽位上限

编辑 `src/config/saves.ts` 中的唯一常量：

```typescript
export const MAX_SAVES = 20  // 改成期望数量
```

`SaveDialog` 和 `useSaves` 均自动读取，UI 同步更新。

### 新增场景

1. 在角色目录建 `{scene}.json`
2. 修改前置场景的 `next` 或 `choices[].nextSceneId` 指向新场景
3. 在 `index.json` 的 `scenes` 数组中追加路径

### 更换 / 新增图片资源

- **新增**：图片放入 `public/` 对应目录，在 `index.json` 的 `assets.bg` 或 `assets.portrait` 注册别名
- **更换**：仅改 `index.json` 中别名对应的路径，场景文件不动
- **重命名别名**：改 `index.json` 中的 key，同步更新引用该别名的所有场景文件

---

## 七、开发命令

```bash
pnpm install       # 安装依赖
pnpm dev           # 启动开发服务器
pnpm build         # 类型检查 + 构建生产包
pnpm type-check    # 仅类型检查
pnpm lint          # OxLint + ESLint 自动修复
pnpm format        # Prettier 格式化 src/
```
