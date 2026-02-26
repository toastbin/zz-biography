# Agent Skills 使用指南

## 什么是 Skills

Skills 是 Claude Code 的扩展机制，通过 `SKILL.md` 文件教会 Claude 如何完成特定任务。每个 skill 由一段 YAML frontmatter 和 Markdown 指令组成，Claude 会根据 `description` 字段自动判断是否调用它。

### Skills vs. Slash Commands

| 特性 | Slash Command | Skill |
|------|---------------|-------|
| 存储位置 | `.claude/commands/` | `.claude/skills/<name>/` |
| 自动触发 | 不支持 | **支持**（基于 description） |
| 支持附属文件 | 不支持 | 支持（scripts/、references/ 等） |
| 手动调用 | `/command-name` | `/skill-name` |

---

## 目录结构

```
.claude/skills/my-skill/
├── SKILL.md              # 必需：入口文件
├── scripts/              # 可选：执行脚本（Python、Bash 等）
├── references/           # 可选：参考文档
└── assets/               # 可选：模板、资源文件
```

Skills 可以放在两个位置：

| 位置 | 范围 | 说明 |
|------|------|------|
| `.claude/skills/` | 当前项目 | 提交 git，团队共享 |
| `~/.claude/skills/` | 所有项目 | 个人 skill，跨项目使用 |

---

## 创建 Skill

### SKILL.md 格式

```yaml
---
name: skill-name          # skill 标识符
description: 描述此 skill 做什么，以及何时应该使用它
---

Markdown 格式的指令内容...
```

### Frontmatter 字段说明

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 否 | skill 标识符，小写 + 连字符，最多 64 字符 |
| `description` | **是** | Claude 判断是否触发的核心字段 |
| `disable-model-invocation` | 否 | `true` 时只能手动调用，禁止自动触发 |
| `user-invocable` | 否 | `false` 时隐藏，不出现在 `/` 菜单 |
| `allowed-tools` | 否 | 限制 skill 激活时可用的工具列表 |
| `context` | 否 | `fork` 时在独立 subagent 中运行 |
| `agent` | 否 | 与 `context: fork` 配合，指定 agent 类型 |
| `argument-hint` | 否 | 自动补全中显示的参数提示，如 `[file-path]` |

---

## 项目中的 Skills 示例

### 示例 1：最简 Skill（format-skill）

`.claude/skills/format-skill/SKILL.md`

```yaml
---
name: format
description: 使用 Prettier 格式化 src 目录下的所有代码
---

执行命令:
```bash
pnpm format
```
```

触发方式：
- 手动：`/format`
- 自动：Claude 认为需要格式化时自动调用

---

### 示例 2：带工作流程的 Skill（gitnexus-exploring）

`.claude/skills/gitnexus/exploring/SKILL.md`

```yaml
---
name: gitnexus-exploring
description: Navigate unfamiliar code using GitNexus knowledge graph
---

# Exploring Codebases with GitNexus

## When to Use
- "How does authentication work?"
- "What's the project structure?"

## Workflow

1. READ gitnexus://repo/{name}/context   → 获取代码库概览
2. gitnexus_query({query: "..."})        → 查找执行流
3. gitnexus_context({name: "symbol"})   → 深入分析单个符号

## Checklist

- [ ] READ context 资源
- [ ] query 相关概念
- [ ] context 关键符号
- [ ] 读取源文件
```

---

### 示例 3：带参数的 Skill

```yaml
---
name: fix-issue
description: 修复 GitHub issue 中描述的 bug
disable-model-invocation: true
argument-hint: "[issue-number]"
---

修复 GitHub issue #$ARGUMENTS：

1. 使用 `gh issue view $ARGUMENTS` 阅读 issue
2. 定位相关代码
3. 实现修复
4. 编写测试
5. 创建 commit
```

使用：
```bash
/fix-issue 123
```

参数变量：

| 变量 | 说明 |
|------|------|
| `$ARGUMENTS` | 所有参数原文 |
| `$ARGUMENTS[0]` | 第一个参数 |
| `$0`、`$1`... | 简写形式 |

---

### 示例 4：在 Subagent 中运行

```yaml
---
name: deep-research
description: 深入研究代码库中的某个功能模块
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob, Bash(git *)
---

彻底研究 $ARGUMENTS：

1. 用 Glob 查找相关文件
2. 用 Grep 搜索关键词
3. 读取核心文件
4. 总结发现，附带文件引用
```

`context: fork` 会启动一个独立的子 agent，不占用主对话上下文。

---

### 示例 5：带动态上下文注入

使用 `` !`command` `` 语法，skill 加载时**立即执行**命令并将结果注入内容：

```yaml
---
name: pr-summary
description: 总结当前 PR 的变更内容
allowed-tools: Bash(gh *)
---

## 当前 PR 信息

- 变更文件：!`gh pr diff --name-only`
- 最近提交：!`git log --oneline -5`

根据以上信息生成 PR 摘要...
```

---

### 示例 6：只读安全 Skill

```yaml
---
name: audit-code
description: 审计代码安全性，只读模式，不做任何修改
allowed-tools: Read, Grep, Glob
---

以只读方式审计代码：

1. 搜索潜在的安全问题（硬编码密钥、SQL 拼接、XSS）
2. 列出高风险位置
3. 给出修复建议（不直接修改文件）
```

---

### 示例 7：带 Hooks 的 Skill

```yaml
---
name: safe-writer
description: 写入文件后自动执行 lint 校验
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "pnpm lint"
---

按要求修改文件，每次写入后自动触发 lint 检查。
```

---

## 触发机制

### 自动触发

Claude 读取所有 skill 的 `description`（约 100 词的元数据），当用户请求与描述匹配时自动调用。

**description 写作技巧：**

```yaml
# 不好：太模糊
description: 解释代码

# 好：说明做什么 + 何时用
description: 解释代码的工作原理。当用户询问"这怎么工作的"、需要理解某个模块、学习代码库架构时使用。

# 更好：加入触发词
description: 解释代码的工作原理。在解释代码、教学、讨论架构时使用。当用户说"帮我理解"、"这是什么意思"、"为什么这样写"时总是使用此 skill。
```

### 禁止自动触发

```yaml
---
name: deploy
description: 部署应用到生产环境
disable-model-invocation: true   # 只能手动 /deploy 调用
---
```

### 隐藏 Skill

```yaml
---
name: internal-context
description: 提供项目历史决策背景
user-invocable: false   # 不出现在 / 菜单，仅 Claude 调用
---
```

---

## skills-lock.json

`skills-lock.json` 是 skill 的版本锁定文件，类似 `package-lock.json`：

```json
{
  "version": 1,
  "skills": {
    "skill-creator": {
      "source": "anthropics/skills",
      "sourceType": "github",
      "computedHash": "9b03bb78ec5c81..."
    }
  }
}
```

作用：
- **版本锁定**：记录已安装 skill 的内容哈希
- **团队一致性**：提交后团队成员使用相同版本
- **更新检测**：哈希变化时提示有新版本

---

## Skills、MCP、Hooks 的关系

```
用户请求
   ↓
Claude 匹配 Skill description
   ↓
加载 SKILL.md 内容（含动态注入 !`cmd`）
   ↓
Skill 执行时可调用：
  ├─ 内置工具（Read / Write / Bash 等）
  ├─ MCP 工具（mcp__server__tool）  ← 需在 .mcp.json 配置
  └─ 触发 Hooks（PostToolUse 等）   ← 在 skill 生命周期内生效
```

| 机制 | 职责 |
|------|------|
| **Skill** | 指令层：告诉 Claude 怎么做 |
| **MCP** | 工具层：提供外部数据/操作能力 |
| **Hook** | 验证层：在操作前后执行校验或副作用 |

---

## 快速创建 Skill

### 手动创建

```bash
mkdir -p .claude/skills/my-skill
```

写入 `.claude/skills/my-skill/SKILL.md`：

```yaml
---
name: my-skill
description: 做某件事。当用户...时使用。
---

你的指令...
```

### 使用 skill-creator（推荐）

在 Claude Code 中：
```
/skill-creator 帮我创建一个 skill，用于检查代码中的 TODO 注释并生成任务列表
```

`skill-creator` 会自动生成 SKILL.md、设计 description、并可运行 eval 测试效果。
