# Claude Code MCP 使用指南

## 什么是 MCP

MCP（Model Context Protocol）是 Claude Code 的插件协议，允许外部服务以标准化方式向 Claude 暴露**工具（Tools）**和**资源（Resources）**，从而扩展 Claude 的能力。

---

## 一、注册配置

### 配置文件位置（4个作用域）

优先级从高到低：

| 作用域 | 位置 | 说明 |
|--------|------|------|
| **被管理（企业）** | `/etc/claude-code/managed-mcp.json` | 最高优先级，不可被覆盖 |
| **本地** | `~/.claude.json`（按项目路径） | 对当前项目私有，不提交 git |
| **项目** | `.mcp.json`（项目根目录） | 团队共享，提交 git |
| **用户** | `~/.claude.json` | 全局生效，最低优先级 |

同名 server 以优先级高的配置为准。

### 配置文件格式

**`.mcp.json`（项目级，推荐团队共享）**：

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GH_TOKEN}"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "python",
      "args": ["db-server.py"],
      "env": {
        "DB_URL": "${DATABASE_URL:-postgresql://localhost:5432}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}"
      }
    }
  }
}
```

环境变量支持两种语法：
- `${VAR}` — 必须设置，否则配置加载失败
- `${VAR:-default}` — 未设置时使用默认值

---

## 二、三种传输协议

| 协议 | 适用场景 | 通信方式 | 状态 |
|------|----------|----------|------|
| **stdio** | 本地进程（脚本、CLI 工具） | 子进程 stdin/stdout | 推荐 |
| **http** | 远程服务 | HTTP POST + 流式响应 | 推荐 |
| **sse** | 旧版远程服务 | Server-Sent Events | 已弃用 |

---

## 三、运行生命周期

```
Claude Code 启动
   ↓
读取所有作用域配置，按优先级合并
   ↓
扩展环境变量（${VAR:-default}）
   ↓
启动 MCP Server
   ├─ stdio：生成子进程
   └─ http：建立网络连接
   ↓
initialize 握手 → 获取 server 能力声明
   ↓
list_tools + list_resources → 获取工具/资源列表
   ↓
工具定义注入 Claude 上下文
   ↓
用户请求 → Claude 决策调用工具 → call_tool → 返回结果
```

所有消息使用 **JSON-RPC 2.0** 格式。

---

## 四、工具和资源

### Tools（工具）

MCP server 声明工具的 JSON Schema，Claude 可直接调用：

```json
{
  "name": "query_database",
  "description": "执行 SQL 查询",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "SQL 语句" },
      "limit": { "type": "integer", "description": "返回行数上限" }
    },
    "required": ["query"]
  }
}
```

当工具数量超过上下文的 10%，Claude Code 自动启用 **Tool Search**，按需检索工具而非全量加载。

```bash
# 调整 Tool Search 阈值（默认 10%）
export ENABLE_TOOL_SEARCH=auto:5   # 5% 时启用
export ENABLE_TOOL_SEARCH=false    # 禁用，全量预加载
```

### Resources（资源）

通过 URI 引用，格式为 `@servername:protocol://path`，在对话中 `@` 提及时自动获取并注入上下文：

```
@github:issue://456
@postgres:schema://users
@docs:file://api/auth
```

在输入框中使用：
```
> 分析 @github:issue://456 并建议修复方案
```

---

## 五、添加 MCP Server

### 方式一：命令行

```bash
# HTTP 类型（远程服务）
claude mcp add --transport http --scope project <名称> <URL>

# stdio 类型（本地进程）
claude mcp add --transport stdio --scope project <名称> -- <命令> [参数]

# 带环境变量
claude mcp add --transport stdio --scope project \
  --env API_KEY=xxx <名称> -- npx -y <包名>

# 带认证头的 HTTP
claude mcp add --transport http --scope project \
  --header "Authorization: Bearer token" <名称> <URL>
```

> `--scope project` 会自动在项目根目录写入 `.mcp.json`。

**注意：所有选项必须在服务名称之前：**
```bash
✅ claude mcp add --transport stdio --scope project myserver -- npx server
❌ claude mcp add myserver --transport stdio -- npx server
```

### 方式二：手动编辑 `.mcp.json`

直接在项目根目录创建或编辑 `.mcp.json`。

### 常见场景示例

```bash
# 文件系统访问
claude mcp add --scope project fs -- \
  npx -y @modelcontextprotocol/server-filesystem /

# GitHub
claude mcp add --transport http --scope project \
  github https://api.githubcopilot.com/mcp/

# 本地自定义脚本
claude mcp add --scope project myscript -- node ./scripts/mcp-server.js
```

---

## 六、管理命令

```bash
claude mcp list                     # 列出所有已注册服务
claude mcp get <名称>               # 查看某个服务的详细配置
claude mcp remove <名称>            # 移除服务
claude mcp reset-project-choices    # 重置项目级安全确认
claude mcp add-from-claude-desktop  # 从 Claude Desktop 导入配置

/mcp                                # 在会话内查看状态和 OAuth 认证
```

---

## 七、权限控制

在 `.claude/settings.json` 中限制 MCP 工具的使用：

```json
{
  "permissions": {
    "allow": [
      "MCP(postgres:*)",
      "MCP(github:read_*)"
    ],
    "deny": [
      "MCP(untrusted:*)"
    ]
  }
}
```

企业级管理配置（`managed-mcp.json`）支持 allowedMcpServers / deniedMcpServers 策略，可集中管控哪些 server 允许使用。

---

## 八、调试

```bash
export MCP_TIMEOUT=10000          # 设置超时（毫秒，默认无限）
export MAX_MCP_OUTPUT_TOKENS=50000  # 增加工具输出 token 上限
```

首次使用项目级 MCP server 时，Claude Code 会弹出安全确认对话框，选择信任后才会启动该 server。
