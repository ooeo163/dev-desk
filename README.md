# DevDesk

本地优先的中文开发者工作台，用于管理凭证、任务、工作记录和项目笔记。数据保存在运行服务的机器上，浏览器通过 Next.js Server Actions 访问本地 SQLite。

> 文档核对日期：2026-10-15。说明以当前工作区代码为准，包含尚未提交的项目笔记模块；PM2 正在运行的构建不一定包含这些源码改动。

## 当前版本与技术栈

应用版本为 `0.1.0`（`package.json`），尚无 Git 版本标签。当前基线提交为 `48d592d`（2026-07-31，添加 Excel 导出功能）。下表中的依赖版本取自当前锁文件。

| 层 | 技术 / 版本 |
|---|---|
| 框架 | Next.js 16.2.9，App Router、Server Actions、`src/proxy.ts` |
| 界面 | React 19.2.4、TypeScript 5.9.3 |
| 样式 | Tailwind CSS 4.3.0、shadcn/ui（base-nova / Base UI）、lucide-react |
| 数据库 | SQLite、better-sqlite3 12.10.0、Drizzle ORM 0.45.2 |
| 状态 | Zustand 5.0.14、TanStack React Query 5.101.0 |
| 编辑与拖拽 | Tiptap 3.26.0、@dnd-kit/core 6.3.1 |
| 导出 | ExcelJS 4.4.0，生成 `.xlsx` |

`archiver` 与 `archiver-zip-encrypted` 已加入工作区依赖，但当前源码尚未接入加密 ZIP 导出。

## 已实现功能

### 仪表板

- 凭证总数与待办 / 进行中 / 已完成任务统计，支持跳转对应页面。
- 最近凭证与任务列表，支持复制密码、切换任务状态和弹窗查看 / 编辑。
- 按周切换工作记录；“项目”“任务详情”双区块内联编辑，失焦保存。

### 凭证管理

- 标题、地址、用户名、密码、API Key、TOTP Secret、备注及标签的增删改查。
- 标题 / 用户名搜索、基于标签名称匹配的类型筛选、类型内标签筛选。
- 标签独立管理，凭证保存标签 ID 数组；被凭证使用的标签不能删除。
- 用户名、密码和 API Key 快捷复制，密码 / API Key / TOTP Secret 独立显隐。
- Excel 导出入口要求重新输入主密码，导出全部凭证，包括解密后的敏感字段。
- TOTP 当前支持密钥存储、查看与复制，尚未生成动态验证码。

### 任务看板

- 桌面三栏看板，移动端按状态切换；桌面拖拽切换状态，使用乐观更新。
- 待办 / 进行中 / 已完成三种状态，0～3 四级优先级，可关联凭证。
- Tiptap HTML 富文本描述；每种状态独立分页，每页 20 条。
- 编辑、删除、详情查看、状态快捷切换与全部任务 Excel 导出。

### 工作记录

- 按周保存“项目”“任务详情”两段文本，支持创建本周记录、历史记录查看 / 编辑 / 删除。
- 编辑区失焦保存；仪表板也可查看和编辑对应周的记录。
- Excel 导出全部工作记录。
- 当前没有任务完成后自动同步工作记录、项目进度自动继承或工作条目取消功能。`work_log_items` 为保留表，当前业务代码未使用。

### 项目笔记（当前工作区新增）

- 按项目分组和折叠，支持标题、正文、项目名搜索。
- 项目名、标题、纯文本正文和独立的标签字符串数组。
- 新建 / 编辑 / 删除；已有笔记正文修改后延迟 800ms 自动保存，项目名 / 标题 / 标签手动保存。
- 桌面双栏与移动端布局；未接入命令面板搜索、Markdown 预览和 Excel 导出。

### 通用体验

- `Ctrl/Cmd + K` 命令面板，预加载凭证和最多 200 条任务，支持详情弹窗及密码 / API Key 快捷复制。
- 亮色 / 暗色 / 跟随系统三种主题，首次默认暗色；响应式侧边栏与空状态插画。
- 自动锁定可设为 1 / 5 / 10 / 30 分钟或禁用，默认 5 分钟。
- `/quick-search` 提供独立快捷搜索页，兼容外部 Electron 宿主桥接；本仓库未提供 Electron 主进程或打包命令。

## 数据与加密边界

1. 初始化和解锁时，主密码提交给服务端校验；SQLite 的 `vault_meta` 保存密码验证值和 KDF 盐值。
2. 浏览器使用 Web Crypto API，以 PBKDF2（600,000 次、SHA-256、256 位）派生 DEK，放在 Zustand 内存中，不持久化到浏览器存储。
3. 凭证创建 / 更新 / 解密 / 导出会把 Base64 编码的 DEK 传给 Server Actions，由 Node `crypto` 执行 AES-256-GCM。
4. 加密字段为凭证的密码、API Key、TOTP Secret 和备注。密文格式为 `Base64(iv[16] + authTag[16] + ciphertext)`，不包含 KDF 盐值。
5. 凭证标题 / 地址 / 用户名 / 标签、任务、工作记录、项目笔记均以明文保存。Excel 导出文件未加密，凭证导出包含敏感信息。

这套实现是敏感字段的静态加密，服务端参与密码验证和加解密，不能描述为“DEK 不离开浏览器”或端到端零知识架构。

会话 Cookie 为 `vault_session`，由 HMAC-SHA256 签名，有效期 24 小时，设置了 `httpOnly`、`sameSite=lax`，当前 `secure=false`。`src/proxy.ts` 仅匹配 `/dashboard/:path*`，检查 Cookie 存在、分段格式及过期时间，尚未验证签名；`verifySession()` 已定义但尚未接入数据 Actions，`/quick-search` 也不在 matcher 内。完整的现状和待处理项见 [项目分析](PROJECT_ANALYSIS.md)。

## 开发运行

Next.js 16.2.9 的最低 Node.js 版本为 20.9；当前机器核对环境为 Node.js 24.20.0、npm 11.19.0。better-sqlite3 包含原生模块，切换 Node.js 版本后需确认依赖仍可加载。

```powershell
npm ci
New-Item -ItemType Directory -Path data -Force
```

创建 `.env.local`，配置自己的随机会话签名密钥：

```dotenv
SESSION_SECRET=replace-with-your-own-random-secret
```

未配置时，代码会回退到内置开发密钥。主密码由首次打开页面时设置，不是这个环境变量。

### 数据库迁移

数据库和迁移配置分别位于 `data/vault.db`、`drizzle.config.ts`，启动应用不会自动执行迁移。常规命令为：

```powershell
npm run db:migrate
npm run dev
```

开发地址为 http://localhost:3000。

**当前迁移存在已知不一致，使用前需先核对：** `drizzle/0005_notes_table.sql` 已存在，但日志中的 `when=1754379000000` 小于 `0004` 的 `1781409057434`。当前 Drizzle SQLite 迁移器按时间戳决定是否执行，已应用 `0004` 的数据库会跳过该 `0005`。本机只读检查发现 `notes` 表已经存在，但迁移记录只有 `0000`～`0004`。因此不能以“页面已有笔记表”或迁移命令退出成功作为迁移链完整的依据；先备份、核对表结构和迁移记录，再制定修复方案。本次文档更新未修复迁移或改动数据库。

仅在开发中修改 schema 后生成迁移，并审查生成的 SQL、快照和日志；不要把生成迁移作为每次启动的步骤：

```powershell
npm run db:generate
```

`src/lib/db/migrate-tags.ts` 是旧标签名称转标签 ID 的一次性数据脚本，不随应用自动运行，也不应在已迁移数据库上重复执行。

## 生产运行与 PM2

生产模式使用构建产物 `.next`，修改源码后需要重新构建并重启才能加载新版本。

手动运行：

```powershell
npm run build
npm run start -- --port 3001
```

本机 `ecosystem.config.js` 配置如下；换机器或目录时需调整 `cwd`：

| 项目 | 配置 |
|---|---|
| 进程名 | `dev-desk` |
| 工作目录 | `D:\workspace\dev-desk` |
| 启动入口 / 参数 | `node_modules/next/dist/bin/next start` |
| 环境 | `NODE_ENV=production`、`PORT=3001` |
| 实例 / 内存重启阈值 | 1 / 256M |

首次注册与后续更新分别使用以下命令（需先安装 PM2）：

```powershell
# 首次注册：先完成构建，再启动
pm2 start ecosystem.config.js

# 已有 dev-desk 进程更新：完成构建后重启
pm2 restart ecosystem.config.js --only dev-desk --update-env

# 查看状态或日志
pm2 status
pm2 logs dev-desk
```

2026-10-15 已核实本机 PM2 的 `dev-desk` 为 online，运行目录即本项目，监听 3001。该检查只确认进程路径和参数，没有确认其构建对应的源码提交；本次未构建或重启服务。

## 数据库结构

业务 schema 定义了七张表；Drizzle 另维护 `__drizzle_migrations`。

| 表 | 主要字段与用途 | 存储方式 |
|---|---|---|
| `credentials` | `id`、`title`、`username`、`address`、三个 `*_cipher`、`notes`、`tags`、创建 / 更新时间 | 三个密钥字段及备注加密；`tags` 为标签 ID 的 JSON 数组 |
| `tags` | `id`、唯一 `name`、`created_at` | 明文，凭证标签目录 |
| `tasks` | `title`、`description`、`status`、`priority`、`credential_id`、`created_at` | 明文，描述为 HTML，凭证关联为外键 |
| `work_logs` | `week_start`、`week_end`、`project_progress`、`task_details`、创建 / 更新时间 | 明文，当前工作记录使用此表 |
| `work_log_items` | `work_log_id`、`content`、`is_cancelled`、`sort_order`、`source_task_id` | 保留的条目表，当前 Actions 未使用 |
| `notes` | `project`、`title`、`content`、`tags`、创建 / 更新时间 | 明文，标签为笔记自己的 JSON 字符串数组 |
| `vault_meta` | `key`、`value` | 密码验证值、KDF 盐值与自动锁定设置 |

数据库启用 WAL 和外键约束，ID 使用 nanoid。备份应覆盖 SQLite 的一致状态；`backup.bat` 只是依次复制 `vault.db`、`vault.db-shm`、`vault.db-wal` 到硬编码的 `D:\work\buckup\DevDesk\日期`，同日重复执行会使用同一目录，不提供在线一致性保证或恢复界面。当前没有应用内加密备份 / 恢复功能。

## 路由与目录

| 路由 | 用途 |
|---|---|
| `/` | 主密码初始化 / 解锁 |
| `/dashboard` | 统计、最近数据、按周工作记录 |
| `/dashboard/credentials` | 凭证与标签管理 |
| `/dashboard/tasks` | 任务看板 |
| `/dashboard/work-logs` | 工作记录 |
| `/dashboard/notes` | 项目笔记（工作区新增） |
| `/dashboard/settings` | 主题与自动锁定设置 |
| `/quick-search` | 独立快捷搜索页 |

- `src/actions/`：数据库读写、密码验证、Excel 导出。
- `src/lib/db/`：数据库连接、schema 和旧标签迁移脚本。
- `src/lib/validation.ts`：业务 Zod schemas。
- `src/lib/client-crypto.ts`、`src/lib/crypto.ts`：客户端密钥派生与服务端加解密。
- `src/components/layout/`、`src/components/vault/`：布局与业务组件。
- `src/components/ui/`：shadcn 组件及现有编辑器等封装。
- `src/store/`、`src/hooks/`：内存解锁状态、自动锁定和快捷键。
- `drizzle/`：SQL 迁移、schema 快照和迁移日志。

## 命令与验证

| 命令 | 用途 |
|---|---|
| `npm run dev` | 开发服务器，默认 3000 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行已有生产构建，未指定端口时默认 3000 |
| `npm run lint` | ESLint 检查 |
| `npm run db:generate` | 根据 schema 生成迁移 |
| `npm run db:migrate` | 应用符合时间戳条件的迁移 |
| `npm run db:studio` | Drizzle Studio |
| `npx tsc --noEmit --incremental false` | 不生成输出文件的 TypeScript 检查 |

没有配置自动化测试运行器。2026-10-15 核对时 TypeScript 检查通过；ESLint 为 15 个错误、10 个警告，涉及 Effect 内同步更新状态、memo 依赖和未使用变量等。Next.js 16 的生产构建不会自动执行 ESLint，需要单独运行；本次未执行生产构建或浏览器功能回归。

## 远程与文档

- `origin`：[GitHub](https://github.com/ooeo163/dev-desk)，本地 `main` 跟踪 `origin/main`。
- `gitee`：[Gitee](https://gitee.com/huang-yihong-00216/dev-desk)，独立远程，不会随 GitHub 自动同步。
- 2026-10-15 查询时，GitHub main 为 `48d592d`，Gitee main 为 `296bf58`，落后 7 个提交；工作区新增笔记和归档依赖尚未提交。
- [AGENTS.md](AGENTS.md)：开发约定和架构边界。
- [CLAUDE.md](CLAUDE.md)：引用统一开发约定的入口。
- [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)：当前代码分析与已知问题。
- [UI-REVIEW.md](UI-REVIEW.md)：基于当前源码的界面检查。

`AGENTS.md`、`CLAUDE.md`、`UI-REVIEW.md` 已显式纳入本次文档提交；`.gitignore` 仍保留同名匹配规则，但不会影响已跟踪文件的后续更新。`.workbuddy/` 工具历史记录仅保留本地；SQLite 数据目录和 `.env*` 被忽略。根目录 `vault.db.backup` 未被忽略，不应混入源码提交。
