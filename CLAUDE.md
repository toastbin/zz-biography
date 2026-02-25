# zz-biography 项目指南

## 项目概述

这是一个使用 Vue 3 + TypeScript + Vite 构建的个人传记/简历网站项目。

## 技术栈

- **框架**: Vue 3.5 (Composition API)
- **构建工具**: Vite
- **语言**: TypeScript 5.9
- **路由**: Vue Router 5
- **包管理器**: pnpm
- **代码规范**: ESLint + OxLint + Prettier

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

## 项目结构

```
src/
├── App.vue          # 根组件
├── main.ts          # 入口文件
├── components/      # 组件目录
├── views/           # 页面视图
├── router/          # 路由配置
└── assets/          # 静态资源
```

## 开发规范

1. 组件使用 `<script setup lang="ts">` 语法
2. 样式使用 scoped 或 CSS Modules
3. 提交前运行 `pnpm lint` 和 `pnpm type-check`
4. 遵循 Vue 3 Composition API 最佳实践

## 注意事项

- Node.js 版本要求: ^20.19.0 || >=22.12.0
- 使用 pnpm 作为包管理器，不要使用 npm 或 yarn
