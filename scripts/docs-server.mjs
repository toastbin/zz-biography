#!/usr/bin/env node
/**
 * docs-server — serve multiple doc directories as a browsable HTML page
 * Usage: pnpm doc
 */

import { createServer } from 'http'
import { readdirSync, readFileSync, existsSync, watch } from 'fs'
import { join, relative, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { exec, execSync } from 'child_process'

// ── SSE clients ───────────────────────────────────────────────────────────────
const sseClients = new Set()

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = 4999

// ── Doc sources ───────────────────────────────────────────────────────────────
const DOC_SOURCES = [
  { id: 'docs-101', label: '📘 项目文档', dir: join(ROOT, 'docs-101') },
  { id: 'docs',     label: '📚 通用文档', dir: join(ROOT, 'docs') },
]

// ── File tree ─────────────────────────────────────────────────────────────────
const SUPPORTED_EXTS = new Set(['.md', '.txt', '.json', '.yaml', '.yml'])

function scanDocs(dir, sourceId) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  const nodes = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      const children = scanDocs(fullPath, sourceId)
      if (children.length) nodes.push({ type: 'dir', name: entry.name, children })
    } else if (SUPPORTED_EXTS.has(extname(entry.name))) {
      nodes.push({
        type: 'file',
        name: entry.name,
        sourceId,
        path: relative(join(ROOT, sourceId), fullPath),
      })
    }
  }
  return nodes
}

function renderTreeHtml(nodes, depth = 0) {
  if (!nodes.length) return ''
  const pad = depth > 0 ? `style="padding-left:${depth * 14}px"` : ''
  return nodes
    .map((n) => {
      if (n.type === 'dir') {
        return `<li class="dir-item" ${pad}>
          <span class="dir-label">📁 ${n.name}</span>
          <ul>${renderTreeHtml(n.children, depth + 1)}</ul>
        </li>`
      }
      const icon = n.name.endsWith('.md') ? '📄' : '📃'
      const href = `/?source=${encodeURIComponent(n.sourceId)}&file=${encodeURIComponent(n.path)}`
      const key = `${n.sourceId}::${n.path}`
      return `<li ${pad}>
        <a href="${href}" data-key="${key}">${icon} ${n.name}</a>
      </li>`
    })
    .join('\n')
}

function countFiles(nodes) {
  return nodes.reduce((n, nd) => n + (nd.type === 'file' ? 1 : countFiles(nd.children)), 0)
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────
function mdToHtml(md) {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const blocks = []
  let inCode = false, codeLang = '', codeLines = [], paraLines = []
  const flushPara = () => { if (paraLines.length) { blocks.push({ type: 'para', lines: [...paraLines] }); paraLines = [] } }

  for (const line of md.split('\n')) {
    if (line.startsWith('```')) {
      if (!inCode) { flushPara(); inCode = true; codeLang = line.slice(3).trim(); codeLines = [] }
      else { blocks.push({ type: 'code', lang: codeLang, content: codeLines.join('\n') }); inCode = false; codeLines = []; codeLang = '' }
      continue
    }
    if (inCode) { codeLines.push(line); continue }
    paraLines.push(line)
  }
  flushPara()

  const inline = (s) => {
    s = escape(s)
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    return s
  }

  let html = ''
  for (const block of blocks) {
    if (block.type === 'code') {
      html += `<pre><code class="lang-${escape(block.lang)}">${escape(block.content)}</code></pre>\n`
      continue
    }

    let out = '', i = 0
    const lines = block.lines
    while (i < lines.length) {
      const line = lines[i]
      const h = line.match(/^(#{1,6}) (.+)/)
      if (h) { const lv = h[1].length; const id = h[2].toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,''); out += `<h${lv} id="${id}">${inline(h[2])}</h${lv}>\n`; i++; continue }
      if (/^---+$/.test(line.trim())) { out += '<hr>\n'; i++; continue }
      if (line.startsWith('|')) {
        const rows = []
        while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
        const isHdr = rows.length > 1 && /^\|[-| :]+\|$/.test(rows[1])
        out += '<table>\n'
        rows.forEach((row, ri) => {
          if (isHdr && ri === 1) return
          const cells = row.split('|').slice(1,-1).map(c => c.trim())
          const tag = isHdr && ri === 0 ? 'th' : 'td'
          out += `<tr>${cells.map(c => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>\n`
        })
        out += '</table>\n'; continue
      }
      if (/^[-*] /.test(line)) { out += '<ul>\n'; while (i < lines.length && /^[-*] /.test(lines[i])) { out += `<li>${inline(lines[i].replace(/^[-*] /,''))}</li>\n`; i++ } out += '</ul>\n'; continue }
      if (/^\d+\. /.test(line)) { out += '<ol>\n'; while (i < lines.length && /^\d+\. /.test(lines[i])) { out += `<li>${inline(lines[i].replace(/^\d+\. /,''))}</li>\n`; i++ } out += '</ol>\n'; continue }
      if (line.startsWith('>')) { out += `<blockquote><p>${inline(line.replace(/^> ?/,''))}</p></blockquote>\n`; i++; continue }
      if (line.trim() === '') { i++; continue }
      const chunk = []
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('|') && !/^[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) && !lines[i].startsWith('>') && !/^---+$/.test(lines[i].trim())) { chunk.push(lines[i]); i++ }
      if (chunk.length) out += `<p>${chunk.map(inline).join('<br>')}</p>\n`
    }
    html += out
  }
  return html
}

// ── HTML shell ────────────────────────────────────────────────────────────────
function pageHtml(sections, activeKey, content, fileName) {
  const sidebarSections = sections.map(({ source, nodes }) => {
    const count = countFiles(nodes)
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-label">${source.label}</span>
          <span class="section-count">${count}</span>
        </div>
        <ul>${renderTreeHtml(nodes)}</ul>
      </div>`
  }).join('\n')

  const totalFiles = sections.reduce((n, s) => n + countFiles(s.nodes), 0)

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName ? fileName + ' · ' : ''}Docs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f6f8fa; color: #24292f; display: flex; min-height: 100vh;
    }

    /* ── Sidebar ── */
    #sidebar {
      width: 260px; background: #fff; border-right: 1px solid #d0d7de;
      display: flex; flex-direction: column;
      position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto;
    }
    #sidebar-header {
      padding: 14px 16px 10px; font-weight: 700; font-size: 0.8rem;
      color: #57606a; letter-spacing: 0.06em; text-transform: uppercase;
      border-bottom: 1px solid #d0d7de; background: #fff;
      position: sticky; top: 0; z-index: 1;
    }
    .section { border-bottom: 1px solid #eaecef; padding-bottom: 6px; }
    .section:last-child { border-bottom: none; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px 4px; font-size: 0.78rem; font-weight: 700;
      color: #57606a; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .section-count {
      font-size: 0.7rem; background: #eaecef; color: #57606a;
      border-radius: 10px; padding: 1px 7px; font-weight: 500;
    }
    #sidebar ul { list-style: none; padding: 0 0 6px 0; }
    #sidebar li { padding: 0; }
    .dir-item { padding: 4px 0 2px !important; }
    .dir-label {
      display: block; padding: 3px 16px; font-size: 0.8rem;
      font-weight: 600; color: #57606a;
    }
    #sidebar a {
      display: block; padding: 5px 16px; color: #24292f;
      text-decoration: none; font-size: 0.875rem;
      border-left: 3px solid transparent;
      transition: background 0.1s, border-color 0.1s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #sidebar a:hover { background: #f6f8fa; }
    #sidebar a.active {
      background: #ddf4ff; border-left-color: #0969da;
      color: #0969da; font-weight: 600;
    }

    /* ── Main ── */
    #main { margin-left: 260px; flex: 1; display: flex; justify-content: center; padding: 40px 24px; }
    #content { width: 100%; max-width: 800px; }
    .empty { margin-top: 20vh; text-align: center; color: #57606a; }
    .empty h2 { font-size: 1.4rem; margin-bottom: 8px; }
    .empty p { font-size: 0.9rem; color: #8c959f; margin-top: 4px; }

    /* ── Article ── */
    #article { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 40px 48px; }
    #article h1 { font-size: 1.9rem; padding-bottom: 12px; border-bottom: 1px solid #d0d7de; margin-bottom: 20px; }
    #article h2 { font-size: 1.35rem; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #eaecef; }
    #article h3 { font-size: 1.1rem; margin: 24px 0 8px; }
    #article h4, #article h5, #article h6 { font-size: 1rem; margin: 16px 0 6px; }
    #article p { line-height: 1.75; margin-bottom: 14px; }
    #article ul, #article ol { padding-left: 24px; margin-bottom: 14px; }
    #article li { line-height: 1.7; margin-bottom: 4px; }
    #article pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow-x: auto; font-size: 0.875rem; line-height: 1.6; margin-bottom: 16px; }
    #article code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.875em; background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 4px; padding: 2px 6px; }
    #article pre code { background: none; border: none; padding: 0; font-size: inherit; }
    #article table { border-collapse: collapse; width: 100%; margin-bottom: 16px; font-size: 0.9rem; }
    #article th, #article td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; }
    #article th { background: #f6f8fa; font-weight: 600; }
    #article tr:nth-child(even) td { background: #fafafa; }
    #article hr { border: none; border-top: 1px solid #d0d7de; margin: 24px 0; }
    #article blockquote { border-left: 4px solid #d0d7de; padding: 4px 16px; color: #57606a; margin-bottom: 14px; }
    #article a { color: #0969da; text-decoration: none; }
    #article a:hover { text-decoration: underline; }
    #article strong { font-weight: 600; }
  </style>
</head>
<body>
  <aside id="sidebar">
    <div id="sidebar-header">文档中心</div>
    <nav>${sidebarSections}</nav>
  </aside>

  <main id="main">
    <div id="content">
      ${content
        ? `<div id="article">${content}</div>`
        : `<div class="empty">
            <h2>选择左侧文档开始阅读</h2>
            <p>共 ${totalFiles} 篇文档</p>
          </div>`
      }
    </div>
  </main>

  <script>
    const activeKey = ${JSON.stringify(activeKey || '')}
    document.querySelectorAll('#sidebar a').forEach(a => {
      if (a.dataset.key === activeKey) a.classList.add('active')
    })

    // ── Hot reload via SSE ──
    const es = new EventSource('/events')
    es.addEventListener('change', () => location.reload())
    es.addEventListener('error', () => {})
  </script>
</body>
</html>`
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function handler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // SSE endpoint
  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    res.write(':\n\n') // comment to establish connection
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
    return
  }
  const sourceId = url.searchParams.get('source')
  const fileParam = url.searchParams.get('file')

  // Build sidebar sections (skip missing dirs)
  const sections = DOC_SOURCES
    .filter(s => existsSync(s.dir))
    .map(source => ({ source, nodes: scanDocs(source.dir, source.id) }))

  let content = null, fileName = null, activeKey = null

  if (sourceId && fileParam) {
    const source = DOC_SOURCES.find(s => s.id === sourceId)
    if (!source) { res.writeHead(404); res.end('Unknown source'); return }

    const filePath = join(source.dir, fileParam)
    if (!filePath.startsWith(source.dir)) { res.writeHead(403); res.end('Forbidden'); return }

    try {
      const raw = readFileSync(filePath, 'utf-8')
      fileName = basename(filePath)
      activeKey = `${sourceId}::${fileParam}`
      content = extname(filePath) === '.md'
        ? mdToHtml(raw)
        : `<pre>${raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
    } catch {
      res.writeHead(404); res.end('Not found'); return
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(pageHtml(sections, activeKey, content, fileName))
}

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  execSync(`lsof -t -i:${PORT} | xargs kill -9`, { stdio: 'ignore' })
} catch { /* port was free */ }

const server = createServer(handler)
server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`
  console.log(`  📚 Docs: ${url}`)

  // Watch all doc directories for changes
  for (const source of DOC_SOURCES) {
    if (!existsSync(source.dir)) continue
    watch(source.dir, { recursive: true }, (_, filename) => {
      if (!filename) return
      const ext = extname(filename)
      if (!SUPPORTED_EXTS.has(ext)) return
      console.log(`  ↺  ${source.id}/${filename}`)
      for (const client of sseClients) {
        client.write('event: change\ndata: {}\n\n')
      }
    })
  }

  const cmd = process.platform === 'darwin' ? `open "${url}"` : process.platform === 'win32' ? `start "${url}"` : `xdg-open "${url}"`
  exec(cmd)
})

server.on('error', (err) => {
  console.error(err.message)
  process.exit(1)
})
