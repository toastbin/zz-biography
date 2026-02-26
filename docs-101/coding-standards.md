# 编码规范

## 技术栈版本

| 工具 | 版本 |
|------|------|
| Vue | ^3.5 |
| TypeScript | ~5.9 |
| Vue Router | ^5.0 |
| Vite | beta |
| Node.js | ^20.19.0 或 >=22.12.0 |
| 包管理器 | pnpm（禁止使用 npm / yarn） |

---

## Vue 组件规范

### 文件结构顺序

```vue
<script setup lang="ts">
// 1. 类型导入
// 2. 组件导入
// 3. Props / Emits 定义
// 4. 响应式状态
// 5. 计算属性
// 6. 函数
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件名 | PascalCase | `CharacterCard.vue` |
| 视图文件名 | PascalCase + 语义后缀 | `CharacterSelect.vue` |
| 组件变量名 | PascalCase | `import CharacterCard` |
| Props | camelCase | `selectedCharacter` |
| Emits 事件名 | camelCase | `select`、`confirmSelection` |
| CSS 类名 | kebab-case | `.character-card` |

### Props 定义

使用泛型语法，不使用运行时声明：

```typescript
// ✅ 正确
defineProps<{
  character: Character
  selected: boolean
}>()

// ❌ 避免
defineProps({
  character: Object,
  selected: Boolean,
})
```

---

## TypeScript 规范

- 所有新文件必须是 `.ts` / `.vue`（`lang="ts"`）
- 禁止使用 `any`，必要时用 `unknown` + 类型收窄
- 接口定义放在 `src/types/` 目录
- 导出类型使用 `export type` / `export interface`

---

## 样式规范

### CSS 变量

全局设计 token 定义在 `src/styles/main.css`，组件内使用变量，不硬编码颜色/间距：

```css
/* ✅ 正确 */
color: var(--color-text);
padding: var(--spacing-md);

/* ❌ 避免 */
color: #333333;
padding: 1rem;
```

### 可用变量

**颜色：**
- `--color-bg` `--color-surface` `--color-primary` `--color-primary-hover`
- `--color-text` `--color-text-secondary` `--color-border`

**间距：**
- `--spacing-xs` `--spacing-sm` `--spacing-md` `--spacing-lg` `--spacing-xl`

**圆角：**
- `--radius-sm` `--radius-md` `--radius-lg`

**阴影：**
- `--shadow-sm` `--shadow-md` `--shadow-lg`

**过渡：**
- `--transition-fast` `--transition-normal`

### 作用域

- 组件样式使用 `<style scoped>`
- 全局样式仅放在 `src/styles/main.css`

---

## 目录结构规范

```
src/
├── main.ts              # 入口，只做挂载
├── App.vue              # 根组件，只放 <RouterView />
├── router/
│   └── index.ts         # 路由配置
├── views/               # 页面级组件（对应路由）
├── components/          # 可复用组件
├── data/                # 静态数据 / mock 数据
├── types/               # TypeScript 类型定义
└── styles/
    └── main.css         # 全局样式和 CSS 变量
```

**原则：**
- `views/` 做编排，`components/` 做展示
- 数据获取逻辑放在 `views/` 或单独的 composable，不放在 `components/`
- 类型定义集中在 `types/`，组件内不重复定义

---

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 类型检查 + 构建
pnpm type-check   # 仅类型检查
pnpm lint         # OxLint + ESLint（自动修复）
pnpm format       # Prettier 格式化 src/
pnpm doc          # 启动文档服务器
```
