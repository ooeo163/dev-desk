# DevDesk

**开发者工作台** — 本地优先、注重隐私的凭证与任务管理工具。

## 功能

### 仪表板
- **数据概览** — 凭证总数、待办/进行中/已完成任务统计卡片，点击可跳转对应页面
- **快捷操作中心** — 双栏布局展示最近凭证与最近任务
  - 凭证项一键解密复制密码，点击打开详情弹窗
  - 任务项下拉菜单快速切换状态，点击打开详情弹窗
- **弹窗交互** — 凭证/任务从仪表板直接弹窗查看和编辑，无需跳转页面

### 凭证管理
- **安全加密存储** — 密码、API Key、TOTP Secret 均使用 AES-256-GCM 算法加密后存入 SQLite，密文不离库
- **快捷复制** — 列表项一键复制用户名/密码/API Key，复制后按钮显示 ✓ 视觉反馈
- **标签系统** — 自定义标签分类，输入时自动匹配已有标签建议，支持按标签筛选
- **全文搜索** — 按标题和用户名实时搜索过滤
- **详情面板** — 查看/编辑/删除凭证，支持密码/API Key/TOTP 的独立明文显隐切换

### 任务看板
- **响应式布局** — 桌面端三栏 Kanban 看板，移动端选项卡切换 + 单列列表
- **拖拽操作** — 桌面端拖拽卡片快速切换状态，乐观更新即时反馈
- **富文本描述** — 基于 Tiptap 的富文本编辑器，支持粗体、斜体、下划线、删除线、标题、列表、文字颜色、背景高亮
- **优先级标记** — 无/低/中/高四级优先级，彩色圆点标识，按优先级排序
- **凭证关联** — 任务可与凭证关联，方便追踪上下文
- **快捷菜单** — 下拉菜单一键编辑、删除、切换状态

### 安全体系
- **主密码验证** — PBKDF2 600k 次迭代 + SHA-256 哈希验证，盐值存储在本地
- **客户端解密** — 数据加密密钥 (DEK) 由主密码在客户端派生，仅存于内存，永不发送到服务器
- **会话管理** — HMAC 签名 Cookie 保护会话，服务端无状态
- **自动锁定** — 闲置超时自动锁定，需重新输入主密码

### 体验细节
- **命令面板** — 全局快捷键唤起命令面板，预加载数据，快速导航和搜索
- **深色模式** — 亮色/暗色/跟随系统三种主题，暗色模式通过亮度层级构建空间感
- **空状态插画** — 5 个 SVG 矢量插画（保险柜/剪贴板/时钟/奖杯/放大镜），自动适配主题色
- **动画体系** — 非对称弹窗动画（进入 200ms 缓入，退出 100ms 快出），自定义弹簧/平滑缓动曲线
- **本地优先** — 所有数据存储在本地 SQLite 文件，无需网络服务
- **移动端适配** — 全局响应式设计，触控友好的交互目标，移动端侧边栏抽屉

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | [Next.js 16](https://nextjs.org) (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 数据库 | SQLite (better-sqlite3) |
| ORM | Drizzle ORM |
| 状态管理 | Zustand + TanStack React Query |
| 富文本 | Tiptap |
| 拖拽 | @dnd-kit |

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（SESSION_SECRET 用于签名会话 Cookie）
# 编辑 .env.local:
#   SESSION_SECRET=your-secret-here

# 初始化数据库
npm run db:generate
npm run db:migrate

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm run db:generate` | 生成数据库迁移 |
| `npm run db:migrate` | 应用迁移 |
| `npm run db:studio` | 打开 Drizzle Studio |

## 数据结构

### 凭证 (credentials)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 (nanoid) |
| title | text | 标题 |
| username | text | 用户名 |
| password_cipher | text | 密码（AES-256-GCM 加密） |
| api_key_cipher | text | API Key（AES-256-GCM 加密） |
| totp_secret_cipher | text | TOTP 密钥（AES-256-GCM 加密） |
| notes | text | 备注（加密） |
| tags | text | 标签 (JSON 数组) |

### 任务 (tasks)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 (nanoid) |
| title | text | 标题 |
| description | text | 描述（HTML 富文本） |
| status | text | 状态: todo / in_progress / done |
| priority | int | 优先级: 0-3 |
| credential_id | text | 关联凭证 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `SESSION_SECRET` | 会话 Cookie 签名密钥（必填） |

非本地部署时请修改 `.env.local` 中的默认值。
