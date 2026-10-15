# DevDesk 当前代码分析

> 更新日期：2026-10-15。对象为当前工作区源码，包含未提交的项目笔记及新增归档依赖。本文替代旧版分析中的现状结论；建议不表示已经实现。核对方式为源码、锁文件、Git/PM2 状态及本地数据库结构只读检查，没有进行攻击复现、浏览器回归或生产构建。

## 1. 项目基线

| 项目 | 核对结果 |
|---|---|
| 应用版本 | package.json：0.1.0，无 Git 标签 |
| 源码基线 | main，48d592d，2026-07-31，添加 Excel 导出功能 |
| 框架 | Next.js 16.2.9、React 19.2.4、TypeScript；App Router + Server Actions |
| 数据 | better-sqlite3 + Drizzle；data/vault.db，WAL / 外键已启用 |
| 状态与组件 | Zustand、React Query、Tailwind v4、shadcn base-nova / Base UI |
| GitHub | origin/main 与本地 HEAD 一致 |
| Gitee | main 为 296bf58，落后本地 7 个提交 |
| PM2 | dev-desk，online，cwd 为本项目目录，next start / production / 3001 |

这些远程与运行状态是核对日期的快照。PM2 使用 `.next`，未验证该构建对应哪个提交。工作区笔记模块和归档依赖尚未提交，不能据此认定已发布。版本、命令、路线与数据结构详见 [README](README.md)。

## 2. 已有功能与边界

- 仪表板：统计、最近五条凭证 / 任务、快捷操作、按周工作记录与失焦保存。
- 凭证：敏感字段加密、地址与用户名、独立标签管理、类型 / 标签过滤、标题 / 用户名搜索、复制、详情编辑、Excel 导出。
- 任务：状态 / 优先级 / 关联凭证、HTML 富文本、拖拽、每状态 20 条分页、Excel 导出。
- 工作记录：`project_progress` + `task_details` 双文本，创建本周记录、历史查看与编辑、删除、Excel 导出。
- 项目笔记：纯文本、项目分组、标题 / 内容 / 项目名 LIKE 搜索、独立字符串标签、已有正文 800ms 自动保存。
- 设置：主题和自动锁定。默认暗色，默认五分钟锁定。
- 命令面板：凭证 / 任务 / 操作，任务加载上限 200；未包含项目笔记。
- 外部宿主：`electron.d.ts` 和 `/quick-search` 保留可选桥接；仓库没有 Electron 主进程、preload 或打包流程。

当前没有任务完成同步周报、周记录项目继承、工作条目取消、笔记 Markdown 预览、动态 TOTP、应用内加密备份 / 恢复、剪贴板自动清除。`work_log_items` 仍在 schema 中，但没有当前业务消费者。`archiver` 和 `archiver-zip-encrypted` 仅加入依赖，不能据此认定加密压缩包功能已经实现。

## 3. 加密与会话的实际边界

主密码提交服务端验证，浏览器再用返回的盐派生 DEK。PBKDF2 参数为 600,000 次 / SHA-256 / 256 位；两端参数一致。DEK 在 Zustand 内存中保存，但凭证 Actions 会接收 Base64 DEK，由服务端 AES-256-GCM 加解密。

仅凭证密码、API Key、TOTP Secret 和凭证备注加密。凭证标题 / 用户名 / 地址 / 标签、任务 HTML、周记录和项目笔记为明文。密文打包为 `iv(16) + authTag(16) + ciphertext` 后 Base64 编码，不包含 KDF 盐。旧 README 的“DEK 永不到服务器”和“客户端解密”已经修正文案，实际架构未改变。`crypto.ts` 的 encrypt JSDoc 仍错误地把 salt 写进格式说明，维护时应以函数实现为准。

Cookie 为 HMAC-SHA256 签名与到期时间，有效期 24 小时；`httpOnly=true`、`sameSite=lax`、`secure=false`。自动锁定同时清除内存 DEK 和会话 Cookie，但未显式清理 React Query 缓存。

## 4. 当前待处理问题

以下按代码事实、影响和建议分开列出，不把静态分析当作完整安全审计。

### 4.1 会话校验尚未形成完整服务端边界

**位置：** `src/proxy.ts`、`src/actions/auth.ts`、各数据 Actions、`src/app/quick-search/page.tsx`。

**事实：** Proxy 只覆盖 `/dashboard/:path*`，检查 Cookie 是否存在、是否两段及过期时间，未验证 HMAC，也未显式拒绝非数字到期时间。`verifySession()` 虽然校验签名，但全项目没有其他调用方。数据 Actions 没有独立会话校验；独立快捷搜索页也没有页面级会话检查。

**影响：** 不能把当前路由守卫当作可靠鉴权，元数据及明文业务数据的读写入口缺少统一保护。凭证密文的解密仍需要正确 DEK，不能由此推断仅绕过页面就能解密全部密码。

**建议：** 对服务端数据入口落实会话校验，校验有效签名和有限数值期限，统一路由策略。已查阅安装包内的 Next.js 16.2.9 Proxy 文档：默认 Node.js runtime；不能按旧报告建议给 Proxy 添加 `export const runtime = 'nodejs'`，该配置在 Proxy 中不受支持。修复时读取 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`，不能只依赖 matcher 保护 Server Functions。

### 4.2 任务 HTML 直接渲染

**位置：** `src/components/vault/task-detail.tsx`、`src/actions/tasks.ts`、`src/lib/validation.ts`。

**事实：** 描述字段按字符串接收、存储，详情用 `dangerouslySetInnerHTML` 渲染，未发现独立 HTML 消毒步骤。

**影响：** 若非可信 HTML 进入数据库，存在存储型 XSS 风险。Tiptap 的正常编辑流程不能代替服务端信任边界；本次没有证明任意粘贴内容都会原样保留，也未做恶意输入复现。

**建议：** 明确允许的标签 / 属性并在写入或渲染边界统一处理，覆盖现有内容和各展示入口，再验证安全性与富文本格式保留。

### 4.3 笔记迁移链与实际数据库不一致

**位置：** `drizzle/meta/_journal.json`、`drizzle/0005_notes_table.sql`、`drizzle/meta/`。

**事实：** `0005` 的 `when=1754379000000` 早于 `0004` 的 `1781409057434`，缺少 0005 schema 快照。安装的 Drizzle SQLite 迁移器使用 `lastDbMigration.created_at < migration.folderMillis` 决定是否执行；因此已到 0004 的数据库会跳过这个 0005。本机有 `notes` 表，但 `__drizzle_migrations` 只有前五条记录（0000～0004）。未确定笔记表的创建来源。

**影响：** 本机已有表不能证明新环境或升级环境可完整部署；后续生成迁移也可能受快照缺失影响。

**建议：** 先备份，核对已部署数据库的表结构和迁移记录，再制定能够兼容“已有表 / 无表”的修复与升级方案。不要直接对正在使用的数据库重放 CREATE TABLE。本次未更改迁移或数据库。

### 4.4 密码和导出边界需准确描述

**位置：** `src/lib/crypto.ts`、`src/actions/auth.ts`、`src/components/vault/export-password-dialog.tsx`、`src/actions/credentials.ts`。

**事实：** 密码验证结果和 Cookie 签名使用普通字符串比较；缺少解锁尝试节流；SESSION_SECRET 缺失时有固定开发回退值。凭证导出 UI 重新验证主密码，但 `exportCredentials` 接收 DEK 后直接导出，未独立校验本次密码验证。导出的是未加密 `.xlsx`。

**建议：** 会话修复时一起核对恒定时间比较、输入校验和配置边界；导出身份校验应在服务端形成明确约束。加密容器、端到端加密或 KDF 迁移属于后续设计，当前未实现。

### 4.5 笔记自动保存存在边界情况

**位置：** `src/app/dashboard/notes/page.tsx`。

**事实：** `persistUpdate` 将空正文转换为 `undefined`，Action 只更新非 undefined 字段，因此清空已有正文可能不会写回。卸载时仅清除延迟定时器，没有 flush 尚未保存的正文；切换笔记也没有统一的待保存处理。新建成功后设置了待选中 ID，但该分支没有调用列表失效刷新，能否立即显示取决于后续重新获取数据。

**建议：** 明确“空字符串清空”“保存成功后刷新和选中”“切换 / 离开时待保存内容”的行为，再进行针对性验证。文档仅说明现有延迟保存机制，不保证离开页面前的最后一次输入已保存。

### 4.6 性能、数据完整性与运维事项

| 位置 | 源码可确认的现状 | 后续处理方向 |
|---|---|---|
| `src/lib/db/index.ts` | 模块级创建连接，未显式设置 busy_timeout 或 globalThis 复用 | 有锁竞争 / 开发热更新问题时测量并处理，不能只凭静态代码断言已发生连接泄漏 |
| `src/lib/db/schema.ts` | 业务查询没有显式辅助索引；主键和 tags.name 唯一约束有索引 | 根据查询与数据量设计索引；不能把“没有辅助索引”写成“完全没有索引” |
| 凭证 / 标签 Actions | 凭证全量读取，标签计数扫描并解析 JSON | 数据量增长时评估服务端查询、分页和数据结构 |
| notes LIKE 查询 | 包含式 LIKE，没有 FTS；搜索随输入请求 | 按实际规模评估搜索防抖与全文检索 |
| `searchNotes` | 原生 SQL 返回 snake_case，类型断言为 Drizzle camelCase 模型；当前页面使用 getNotes | 接入该接口前显式映射字段 |
| 凭证删除 | 先解除任务关联，再删除，无显式事务 | 多步写入需要时统一事务 |
| 任务校验 | 创建时检查关联凭证存在，更新主要依赖外键；分页参数不是独立 Zod schema | 补齐边界校验与一致的错误返回 |
| `next.config.ts` | 仅配置本机 allowedDevOrigins，未定义应用安全响应头 | 与鉴权 / HTML 处理一起评估部署边界 |
| `backup.bat` | 按日期目录顺序复制主库 / shm / wal；硬编码机器路径 | 验证备份一致性与可恢复性；不能宣称已实现在线一致备份 |
| 根目录备份 | vault.db.backup 未被忽略 | 源码提交前排除数据文件 |

## 5. 验证基线

2026-10-15 已执行：

- TypeScript：`node ./node_modules/typescript/bin/tsc --noEmit --incremental false` 通过。
- ESLint：`npm run lint` 未通过，15 errors / 10 warnings，涉及 React Effect 同步更新状态、memo 保留和依赖项、未使用变量；包含已有页面及新增笔记页。
- Git：分支、未提交改动、版本标签和两个远程 main 已只读核对。
- PM2：进程目录 / 参数、端口及实际监听 PID 已核对。
- SQLite：以 readonly 连接检查表名和迁移元数据，没有读取业务内容。

没有测试运行器；没有执行生产构建、迁移、服务重启、Excel 打开验证或浏览器功能 / 安全回归。Next.js 16 构建不自动运行 ESLint，不能以构建成功代替 lint。

## 6. 后续优先顺序

1. 修复服务端会话边界、快捷搜索访问范围与任务 HTML 信任边界。
2. 修复 notes 迁移链，验证已有库升级及空库初始化两条路径。
3. 修复笔记自动保存 / 新建刷新，再处理 lint 基线和多步写入一致性。
4. 按需求设计 TOTP、加密备份 / 恢复、剪贴板清除或任务同步；它们仍是候选功能。

[UI 检查](UI-REVIEW.md) 单独记录界面已改进项和需要实测的交互。本文记录问题，不代表本次文档任务已经修复这些问题。
