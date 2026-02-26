---
name: init-skill
description: 初始化一个结构完善的 skill
argument-hint: <skill-name> [description]
disable-model-invocation: true
---

创建一个新的 skill，名称为 `$0`，描述为 `$1`。

## 步骤

### 1. 创建目录结构

在 `.claude/skills/$0/` 目录下创建以下结构：

```
.claude/skills/$0/
├── SKILL.md          # 主定义文件（必需）
├── templates/        # 模板文件目录（可选，按需创建）
└── examples/         # 示例目录（可选，按需创建）
```

### 2. 创建 SKILL.md 文件

使用以下模板：

```markdown
---
name: $0
description: $1
argument-hint: <参数说明>
# disable-model-invocation: true  # 取消注释则禁止 AI 自动调用
---

## 概述

简要说明这个 skill 的用途和适用场景。

## 前置条件

- 列出执行此 skill 前需要满足的条件
- 例如：需要安装的依赖、需要存在的文件等

## 指令

### 步骤 1: [步骤名称]

详细说明第一步的操作...

### 步骤 2: [步骤名称]

详细说明第二步的操作...

## 输出

说明执行完成后的预期输出或结果。

## 示例

提供使用示例（如果适用）：

\`\`\`bash
/skill-name arg1 arg2
\`\`\`
```

### 3. 处理空描述

如果用户没有提供 description（$1 为空），则使用占位符 `TODO: 添加描述`

### 4. 询问用户需求

创建基本文件后，询问用户：
- 是否需要创建 `templates/` 目录存放模板文件
- 是否需要创建 `examples/` 目录存放示例
- skill 的具体功能是什么，以便帮助完善指令内容

### 5. 完成提示

告知用户：
- 文件位置：`.claude/skills/$0/SKILL.md`
- 可编辑 SKILL.md 完善 skill 内容
- 说明 frontmatter 各字段的作用

## Frontmatter 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 是 | skill 名称，用于调用 |
| `description` | 是 | 简短描述，帮助 AI 判断何时使用 |
| `argument-hint` | 否 | 参数提示，显示在帮助中 |
| `disable-model-invocation` | 否 | 设为 true 禁止 AI 自动调用，仅用户手动触发 |
