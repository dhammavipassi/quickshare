# Vercel 部署与后期免费持久化计划（不立刻实施）

本文件描述在 Vercel 上实现“免费可用的持久化数据 + 会话”的改造思路与步骤。

状态：核心改造已落地（Postgres + cookie-session 开关化）。
— 若设置了 `DATABASE_URL`（例如 Neon/Supabase 免费层），将自动切换至 Postgres 并启用无状态 Cookie 会话（适合 Vercel）。
— 本地/Docker 仍保持 SQLite + 文件会话的原体验。

## 现状与限制

- Vercel 函数/Edge 运行时为无状态，文件系统仅 `/tmp` 可写，且生命周期短暂。
- 现已默认在 Vercel 推荐改用云端 Postgres + Cookie 会话，避免临时存储导致的分享链接“很快失效”。

## 免费的持久化方案（已提供）

目标：不改动本地/Docker 体验，仅当部署至 Vercel/云端时启用云端持久化。

### 1) 数据库改造（Neon/Supabase Postgres 免费层）

- 在 Neon 或 Supabase 创建 Postgres 实例，获取连接串 `DATABASE_URL`。
- 在 Vercel 项目环境变量中设置：`DATABASE_URL=...`。
- 代码层改动：
  - `models/db.js` 已支持：存在 `DATABASE_URL` 时走 Postgres 分支，否则保持 SQLite。
  - 已添加 `pg` 依赖与最小适配层；首次连接自动创建 `pages` 表。

### 2) 会话改造（无状态 Cookie 会话，免费）

- 在 Vercel 环境使用 `cookie-session`（或等价的 CookieStore），将登录状态写入签名 Cookie，避免服务器落地存储。
- 环境变量：`SESSION_SECRET`（随机强密钥）、`AUTH_ENABLED=true`、`AUTH_PASSWORD=...`。
- 代码层改动：
  - `app.js` 已按环境切换：检测到 `VERCEL` 或 `DATABASE_URL` 或 `SESSION_STRATEGY=cookie` 即启用 `cookie-session`；否则使用文件会话。

## 配置步骤

1) 在 Neon/Supabase 创建 Postgres，复制连接串 `DATABASE_URL`。

2) 在 Vercel 项目 → Settings → Environment Variables 中设置：
   - `DATABASE_URL` = 连接串
   - `SESSION_SECRET` = 随机强密钥
   - 可选：`SESSION_STRATEGY=cookie`（手动指定，通常不需要）

3) 重新部署。创建的分享链接将长期可用（存于云端数据库）。

## 迁移与兼容

- 本地开发与 Docker 分享完全不变（SQLite + 文件会话）。
- Vercel 部署时自动启用云端 Postgres + Cookie 会话；无需用户改动代码，仅配置环境变量。
- 如需迁移历史 SQLite 数据，可提供一个简易导出脚本，将 SQLite 内容导入 Postgres。

## 非目标（暂不做）

- 引入 Redis/Upstash：虽有免费层，但在我们的场景下 Cookie 会话更轻更易。
- 引入 Turso/libSQL：Postgres 生态更成熟，优先。

---

本计划作为后期迭代项记录于仓库，当前不实施以保持稳定。需要时可开启对应任务落地上述改造。

---

## 附：上线与验证清单（已落地）

- 代码：主干已支持 Postgres + cookie-session 自动切换；本地/Docker 行为不变。
- Vercel 环境变量（Production/Preview 同步）：
  - 必填：`DATABASE_URL`（Neon/Supabase/Vercel Postgres 连接串）
  - 必填：`SESSION_SECRET`（随机强密钥）
  - 可选：`AUTH_ENABLED=true`、`AUTH_PASSWORD=<自定>`、`SESSION_STRATEGY=cookie`
- 部署：保存环境变量后 Redeploy。
- 验证：
  - 日志出现“数据库初始化成功（Postgres）”“[Session] 使用 cookie-session”。
  - 创建一个分享链接，冷启动/再次部署后仍可访问。

## 附：故障排查（Postgres + Cookie 会话）

- 连接失败/握手错误：
  - 确认连接串格式为 `postgresql://user:pass@host/db?sslmode=require`。
  - 如供应商不支持 SSL，可临时设置 `PGSSL_DISABLE=1`（不建议长期关闭）。
- 链接仍会丢：
  - 检查是否遗漏了 Preview 环境变量（仅设置了 Production 时，预览部署仍为临时存储）。
- 登录态异常：
  - 确认已启用 cookie-session（设置了 `DATABASE_URL` 或 `VERCEL` 环境会自动切换）。
- 回退方案：
  - 删除 `DATABASE_URL` 即可回到 SQLite（Vercel 上为临时存储，仅用于演示）。
