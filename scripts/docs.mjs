#!/usr/bin/env node
/**
 * docs viewer — browse docs/ with directory tree
 *
 * Usage:
 *   pnpm docs           # show tree + numbered list
 *   pnpm docs <name>    # display a specific doc (fuzzy match)
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')

// ── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}
const fmt = (code, str) => `${code}${str}${c.reset}`

// ── File tree ────────────────────────────────────────────────────────────────
function scanDocs(dir, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    // dirs first, then files
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  const files = []
  const lines = []

  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1
    const connector = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      lines.push(`${prefix}${fmt(c.bold + c.blue, connector + entry.name + '/')}`)
      const { files: childFiles, lines: childLines } = scanDocs(fullPath, prefix + childPrefix)
      lines.push(...childLines)
      files.push(...childFiles)
    } else if (['.md', '.txt', '.json', '.yaml', '.yml'].includes(extname(entry.name))) {
      const idx = files.length + 1
      lines.push(`${prefix}${c.dim}${connector}${c.reset}${fmt(c.green, `[${idx}]`)} ${entry.name}`)
      files.push(fullPath)
    }
  })

  return { files, lines }
}

// ── Markdown renderer (terminal) ─────────────────────────────────────────────
function renderMarkdown(text) {
  return text
    .split('\n')
    .map((line) => {
      // h1
      if (/^# /.test(line))
        return fmt(c.bold + c.cyan, line.replace(/^# /, '  ◆ ').toUpperCase())
      // h2
      if (/^## /.test(line)) return fmt(c.bold + c.yellow, line.replace(/^## /, '\n  ▸ '))
      // h3
      if (/^### /.test(line)) return fmt(c.bold, line.replace(/^### /, '    › '))
      // code block markers
      if (/^```/.test(line)) return fmt(c.dim, '  ' + '─'.repeat(50))
      // table header separator
      if (/^\|[-| :]+\|$/.test(line)) return fmt(c.dim, line)
      // inline code: `foo`
      line = line.replace(/`([^`]+)`/g, (_, s) => fmt(c.magenta, '`' + s + '`'))
      // bold: **foo**
      line = line.replace(/\*\*([^*]+)\*\*/g, (_, s) => fmt(c.bold, s))
      // list items
      if (/^[-*] /.test(line)) return '  ' + fmt(c.cyan, '•') + line.slice(1)
      // numbered list
      if (/^\d+\. /.test(line)) return '  ' + line
      return line
    })
    .join('\n')
}

// ── Display a doc ─────────────────────────────────────────────────────────────
function showDoc(filePath) {
  const relPath = relative(DOCS_DIR, filePath)
  const divider = '─'.repeat(60)

  console.log()
  console.log(fmt(c.bold + c.cyan, divider))
  console.log(fmt(c.bold, `  📄 docs/${relPath}`))
  console.log(fmt(c.cyan, divider))
  console.log()

  const raw = readFileSync(filePath, 'utf-8')
  const ext = extname(filePath)

  if (ext === '.md') {
    console.log(renderMarkdown(raw))
  } else {
    console.log(raw)
  }

  console.log()
  console.log(fmt(c.dim, divider))
}

// ── Interactive picker ────────────────────────────────────────────────────────
function interactivePicker(files, lines) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const showTree = () => {
    console.log()
    console.log(fmt(c.bold + c.cyan, '  docs/'))
    lines.forEach((l) => console.log('  ' + l))
    console.log()
    console.log(fmt(c.dim, `  共 ${files.length} 个文档`))
  }

  const ask = () => {
    rl.question(fmt(c.bold + c.green, '\n  选择文档编号（或 q 退出）: '), (answer) => {
      if (answer.toLowerCase() === 'q') {
        rl.close()
        return
      }
      const idx = parseInt(answer, 10)
      if (!isNaN(idx) && idx >= 1 && idx <= files.length) {
        showDoc(files[idx - 1])
        showTree()
        ask()
      } else {
        console.log(fmt(c.yellow, `  无效编号，请输入 1 ~ ${files.length}`))
        ask()
      }
    })
  }

  ask()
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  // Check docs/ exists
  try {
    statSync(DOCS_DIR)
  } catch {
    console.error(fmt(c.yellow, '  docs/ 目录不存在'))
    process.exit(1)
  }

  const { files, lines } = scanDocs(DOCS_DIR)

  if (files.length === 0) {
    console.log(fmt(c.dim, '  docs/ 目录为空'))
    process.exit(0)
  }

  // Show tree
  console.log()
  console.log(fmt(c.bold + c.cyan, '  docs/'))
  lines.forEach((l) => console.log('  ' + l))
  console.log()
  console.log(fmt(c.dim, `  共 ${files.length} 个文档`))

  interactivePicker(files, lines)
}

main()
