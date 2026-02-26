# 故事数据规范

## 目录结构

每个角色的故事数据存放在 `public/stories/{characterId}/` 下，**目录层级天然体现分支结构**：

```
public/stories/
└── warrior/
    ├── index.json              ← 必须：manifest 文件
    ├── w_001.json              ← 线性场景
    ├── w_002.json              ← 分支点（含 choices）
    ├── past/                   ← 分支目录
    │   ├── w_past_001.json
    │   └── w_past_002.json
    ├── mission/                ← 分支目录
    │   └── w_mission_001.json
    └── w_end.json              ← 终结场景
```

**命名约定：**
- 目录名 = 分支语义（`past`、`mission`、`guide` …）
- 文件名 = `{角色前缀}_{序号}.json`（如 `w_001.json`、`w_past_001.json`）

---

## index.json 格式

每个角色目录必须有 `index.json`，声明入口场景、资源别名表和所有场景文件路径：

```json
{
  "id": "warrior",
  "startSceneId": "w_001",
  "defaultSpeaker": "战士",
  "assets": {
    "bg": {
      "village":     "/bg/village.jpg",
      "battlefield": "/bg/battlefield.jpg"
    },
    "portrait": {
      "neutral":    "/portraits/warrior_neutral.png",
      "sad":        "/portraits/warrior_sad.png",
      "determined": "/portraits/warrior_determined.png"
    }
  },
  "scenes": [
    "w_001.json",
    "w_002.json",
    "past/w_past_001.json",
    "past/w_past_002.json",
    "mission/w_mission_001.json",
    "w_end.json"
  ]
}
```

- `defaultSpeaker`：场景文件省略 `speaker` 字段时的默认说话人
- `assets.bg` / `assets.portrait`：别名 → 实际路径的映射表，场景文件中统一使用别名
- `scenes`：路径相对于当前角色目录，顺序不影响逻辑，建议按故事流程排列
- **新增场景文件后必须在 `scenes` 中补充路径**，否则运行时不会加载
- **新增图片后在 `assets` 中注册别名**，场景文件无需关心实际路径

---

## 场景文件格式

每个 `.json` 文件对应一个场景，`background` / `portrait` 填写 `index.json` 中定义的别名：

```json
{
  "id": "w_001",
  "background": "village",
  "portrait": "neutral",
  "text": "场景文本内容",
  "next": "w_002"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 场景唯一 ID，必须与文件内容一致 |
| `background` | `string` | 背景别名（对应 `assets.bg` 的 key） |
| `speaker` | `string \| null \| 省略` | 省略 → 继承 `defaultSpeaker`；`null` → 旁白（不显示说话人栏） |
| `portrait` | `string \| null \| 省略` | 立绘别名（对应 `assets.portrait` 的 key）；`null` 或省略 → 不显示立绘 |
| `text` | `string` | 对话或旁白文本 |
| `next` | `string?` | 下一场景 ID（线性推进），与 `choices` 二选一 |
| `choices` | `StoryChoice[]?` | 选项列表（分支），与 `next` 二选一 |

### 选项格式（StoryChoice）

```json
{
  "text": "询问他的过去",
  "nextSceneId": "w_past_001"
}
```

### 终结场景

`next` 和 `choices` 均不填时，该场景为终结场景——运行时会显示「返回选择」按钮。

---

## 维护操作

### 新增线性场景

1. 在角色目录下新建 `w_003.json`，填写 `id`、`background`（别名）、`text`、`next`
2. 将上一个场景的 `"next"` 改为 `"w_003"`
3. 在 `index.json` 的 `scenes` 数组中追加 `"w_003.json"`

### 新增分支

1. 创建分支目录，如 `warrior/secret/`
2. 在目录内新建场景文件，填写各字段（background / portrait 使用别名）
3. 将分支入口场景（含 `choices` 的场景）加入对应选项：
   ```json
   { "text": "探寻秘密", "nextSceneId": "w_secret_001" }
   ```
4. 在 `index.json` 的 `scenes` 中追加 `"secret/w_secret_001.json"`

### 新增 / 更换图片

- **新增**：将图片放入 `public/` 对应目录，在 `index.json` 的 `assets.bg` 或 `assets.portrait` 中注册别名即可，场景文件不需要改动
- **更换**：只改 `index.json` 中该别名对应的路径，场景文件不需要改动
- **重命名别名**：改 `index.json` 中的 key，同步更新所有引用该别名的场景文件

### 新增角色

1. 在 `public/stories/` 下新建 `{id}/` 目录
2. 创建 `index.json`，填写 `id`、`startSceneId`、`defaultSpeaker`、`assets`、`scenes`
3. 按上述结构创建各场景文件
4. 在 `src/data/characters.ts` 中添加角色数据

---

## 运行时加载流程

`StoryView.vue` 挂载时自动完成以下步骤：

```
1. GET /stories/{characterId}/index.json
        ↓ 获得 manifest（scenes 路径列表）
2. Promise.all → 并行 GET 所有场景文件
        ↓ 每个文件返回一个 StoryScene 对象
3. 按 scene.id 组装为 Record<string, StoryScene>
        ↓ 进入故事，跳转到 startSceneId
```

运行时不感知文件目录结构，场景间跳转全部通过 `id` 字符串索引，目录组织仅服务于编辑维护。

---

## 类型定义

对应 TypeScript 类型见 `src/types/story.ts`：

- `StoryManifest` — `index.json` 的结构
- `StoryScene` — 单个场景文件的结构
- `StoryChoice` — 选项的结构
- `CharacterStory` — 运行时组装后的完整故事对象
