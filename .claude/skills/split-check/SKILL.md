---
name: split-check
description: Check if a file exceeds 400 effective lines and provide concrete split recommendations. Trigger when user runs `/split-check <file>`, mentions "文件太长", "需要拆分", or "超过 400 行".
---

# Split Check Skill

## 何时触发

- 用户显式调用 `/split-check <file>`
- 用户提到"文件太长"、"需要拆分"、"超过 400 行"

---

## Phase 1 — 行数统计

根据文件类型计算**有效行数**（`.vue` 文件排除 `<style>` 块，因为 CSS 不代表逻辑复杂度）。

### `.vue` 文件

```bash
awk '/<style/,/<\/style>/ { next } { count++ } END { print count }' <file>
```

### 其他文件（`.ts`、`.js` 等）

```bash
wc -l <file>
```

### 判断

- 有效行数 **≤ 400** → 输出 "文件符合规范（N 行），无需拆分"，结束。
- 有效行数 **> 400** → 进入 Phase 2。

---

## Phase 2 — 文件分析

读取文件全文，依次识别以下拆分点：

### 1. 组件拆分点（`<template>` 部分）

寻找：
- 模板中重复出现的结构（`v-for` 内的复杂子树）
- 逻辑上独立、可独立渲染的 UI 块（modal、panel、card、list-item 等）
- 超过 30 行且有自己的局部状态或事件的区块

### 2. 逻辑拆分点（`<script setup>` 部分）

寻找：
- 围绕同一业务概念聚集的 `ref` / `computed` / `watch` / 函数群（可提取为 composable）
- 与组件 UI 无关的数据获取、状态管理逻辑
- 可独立测试的纯逻辑单元

### 3. 工具函数

寻找：
- 无响应式依赖的纯计算函数（格式化、转换、验证等）
- 可放入 `utils/` 的辅助函数

---

## Phase 3 — 输出建议

以结构化格式输出，包含以下四部分：

### 1. 摘要

```
文件：<path>
有效行数：<N> 行（已排除 <style> 块 <M> 行）
超出限制：<N - 400> 行
```

### 2. 推荐拆分方案（表格）

| 新文件路径 | 职责描述 | 估计行数 |
|-----------|---------|---------|
| `components/XxxPanel.vue` | 负责渲染 ... | ~80 |
| `composables/useXxx.ts` | 管理 ... 的状态与操作 | ~60 |

### 3. 关键拆分点（代码引用）

对每个建议的拆分，引用原文件的行号范围和代码片段：

```
// components/XxxPanel.vue — 来自原文件 L123–L187
<template>
  ...
</template>
```

### 4. 拆分后预估

```
主文件预估行数：~<N> 行（符合 ≤ 400 要求）
```

---

## 拆分原则

- **独立职责优先**：每个提取的单元必须有清晰的单一职责，不要为了凑行数做无意义拆分
- **可独立测试**：composable 不依赖父组件的响应式状态，可单独 import 使用
- **目录规范**：
  - 子组件 → `components/` 子目录（或与主组件同级的 `components/` 文件夹）
  - composable → `composables/` 子目录
  - 工具函数 → `utils/` 或 `lib/`
- **不改变功能**：只做结构性重组，不修改任何业务逻辑
- **保持接口稳定**：父组件的 props / emits 接口不变，只是内部实现移出

---

## 示例输出

对 `src/views/admin/AdminStory.vue`（有效行数 ~550）：

```
文件：src/views/admin/AdminStory.vue
有效行数：552 行（已排除 <style> 块 278 行）
超出限制：152 行

推荐拆分方案：

| 新文件 | 职责 | 估计行数 |
|--------|------|---------|
| components/admin/SceneEditModal.vue | Scene 编辑弹窗（表单 + 校验） | ~120 |
| components/admin/AliasTable.vue | 别名管理表格 | ~60 |
| composables/useSceneCrud.ts | Scene 的增删改查逻辑 | ~80 |

拆分后主文件预估：~290 行（符合 ≤ 400 要求）
```
