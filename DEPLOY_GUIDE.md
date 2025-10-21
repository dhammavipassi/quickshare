# QuickShare 部署与使用指南 (macOS M2)

## 1. 项目概述

QuickShare 是一个基于 Node.js 和 Express.js 开发的在线代码分享工具。它允许用户快速创建、分享和查看 HTML、Markdown、SVG 以及 Mermaid 图表代码片段。该工具界面现代化，支持响应式设计，并提供密码保护、用户认证和会话管理等安全功能，确保代码分享的安全与便捷。

> 重要变更（截图）
> - 为了降低 Serverless 无头浏览器在不同平台的稳定性风险，本项目已移除“服务端截图”相关代码与 API（包括 `/api/pages/screenshot`）。
> - 截图建议在客户端侧完成（例如编辑器/插件的本地截图），QuickShare 专注于“页面创建、查看、分享与存储持久化”等核心能力。

## 2. 部署环境要求

本指南专为在 **Macbook Pro (M2 芯片)** 环境下进行本地部署而设计。

- **硬件**: Macbook Pro (M2 芯片)
- **操作系统**: macOS
- **运行时环境**:
  - **Node.js**: `v14.0.0` 或更高版本
  - **npm**: Node.js 自带的包管理器
- **浏览器**: 最新版本的 Chrome、Safari 或 Firefox

## 3. 本地部署步骤

部署操作将在 `/Users/dhammavipassi/Github_projects` 目录下进行。

### 步骤 1: 克隆项目

打开“终端”应用，进入指定目录，并从 GitHub 克隆项目。

```bash
cd /Users/dhammavipassi/Github_projects
git clone https://github.com/joeseesun/quickshare.git
```

**说明**: 此命令会将名为 `quickshare` 的项目文件夹下载到当前目录。

### 步骤 2: 进入项目目录

```bash
cd /Users/dhammavipassi/Github_projects/quickshare
```

### 步骤 3: 安装项目依赖

使用 `npm` 安装 `package.json` 文件中列出的所有必需依赖。

```bash
npm install
```

**说明**: 此命令会创建一个 `node_modules` 文件夹，并下载所有项目运行所需的库。

### 步骤 4: 关键代码修复 (重要)

在进行部署之前，我们需要修复原始代码中的一些硬编码问题，以确保配置能够灵活生效。

**1. 修复 `app.js` 中的硬编码端口:**
打开 `quickshare/app.js` 文件，找到第 36 行，将其从：
`const PORT = process.env.NODE_ENV === 'production' ? 8888 : config.port;`
修改为：
`const PORT = config.port;`

**2. 修复 `Dockerfile` 中的硬编码配置:**
打开 `quickshare/Dockerfile` 文件，找到并注释掉或删除第 21 至 25 行的 `EXPOSE` 和 `ENV` 指令。修改后应如下所示：
```dockerfile
# 暴露端口
# 端口将由 docker-compose.yml 动态管理
# EXPOSE 8888

# 设置环境变量
# 环境变量将由 docker-compose.yml 通过 env_file 动态注入
ENV NODE_ENV=production
```

### 步骤 5: 配置生产环境变量

对于 Docker 部署，最佳实践是使用独立的 `.env` 文件。请在 `quickshare` 目录下创建一个名为 `.env.production` 的文件。

```bash
# 进入 quickshare 目录
cd /Users/dhammavipassi/Github_projects/quickshare

# 创建并编辑 .env.production 文件
nano .env.production
```

**将以下内容粘贴到 `.env.production` 文件中**:

```
NODE_ENV=production
PORT=3003
AUTH_ENABLED=true
AUTH_PASSWORD=admin123
DB_PATH=./db/database.sqlite
```**说明**: 我们已将端口设置为 `3003`，并将您的登录密码设置为 `Qq112211`。

### 步骤 6: 修改 Docker Compose 配置

打开 `quickshare/docker-compose.yml` 文件，将其修改为以下内容，以确保它能正确加载我们的 `.env.production` 文件并映射正确的端口。

```yaml
services:
  html-go-express:
    build:
      context: .
      dockerfile: Dockerfile
      no_cache: true
    container_name: html-go-express
    restart: unless-stopped
    volumes:
      - html-go-data:/usr/src/app/data
    env_file:
      - .env.production
    networks:
      - html-go-network

  nginx-proxy:
    image: nginx:alpine
    container_name: quickshare-nginx-proxy
    restart: unless-stopped
    ports:
      - "8081:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    networks:
      - html-go-network
    depends_on:
      - html-go-express

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: quickshare-cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token <YOUR_TUNNEL_TOKEN>
    networks:
      - html-go-network
    depends_on:
      - nginx-proxy

volumes:
  html-go-data:
    driver: local

networks:
  html-go-network:
    driver: bridge
```

### 步骤 7: 配置 Nginx 反向代理

我们使用官方 `nginx:alpine` 作为应用的前置代理，统一入口为 `80` 端口，反向代理到应用容器 `html-go-express:3003`。下面是项目内置的 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 使用 Docker 内置 DNS，直接代理到服务名和端口
        proxy_pass http://html-go-express:3003;
    }
}
```

### 步骤 8: 使用 Docker 构建并启动应用

现在，一切准备就绪。执行以下命令来构建并后台启动 Docker 容器（包括应用、Nginx 代理；隧道服务可按需启用）。`--build` 会强制重新构建镜像。

```bash
# 确保您在 quickshare 目录下
cd /Users/dhammavipassi/Github_projects/quickshare

# 构建并启动服务
docker compose up -d --build
```

**预期输出**:
您会看到 Docker 构建镜像并启动容器的日志。成功后，服务将在后台运行。

### 步骤 9: 配置 cloudflared Ingress 规则（命名隧道必需）

若使用命名隧道（`cloudflared tunnel run --token ...`），需要为 `cloudflared` 提供 Ingress 规则，指明将外部流量转发到 Docker 网络内的上游服务（此项目为 Nginx 反代）。否则会出现浏览器 `HTTP 503`，并在 cloudflared 日志中看到：

```
WRN No ingress rules were defined in provided config (if any) nor from the cli, cloudflared will return 503 for all incoming HTTP requests
```

1) 新增配置文件 `cloudflared/config.yml`：

```
ingress:
  - hostname: share.dhammaai.com
    service: http://nginx-proxy:80

  # 兜底规则：其他主机名返回 404
  - service: http_status:404
```

2) 在 `docker-compose.yml` 中挂载该配置并显式指定：

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: quickshare-cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run --token <YOUR_TUNNEL_TOKEN>
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
    networks:
      - html-go-network
    depends_on:
      - nginx-proxy
```

说明：
- `hostname` 使用你的自定义域名（本例为 `share.dhammaai.com`）。
- `service` 指向 Docker 网络中的上游 Nginx 服务（此处即 `nginx-proxy:80`）。
- 使用命名隧道时，`--token` 由 `cloudflared tunnel token <name>` 获得；不要将令牌提交到公共仓库。

3) 重启 cloudflared：

```bash
docker compose up -d --build cloudflared
docker logs -f quickshare-cloudflared
```

看到 `Connected to ...` 且无 503 警告后，Ingress 生效。

### 更安全的 Token 传递（Compose 变量插值）

推荐把 token 写入项目根目录的 `.env`（默认被 .gitignore 忽略，避免入库），并在 compose 中用 `${CF_TUNNEL_TOKEN}`：

1) 新建或编辑 `./.env`：
```
CF_TUNNEL_TOKEN=<你的 token>
```

2) 修改 `docker-compose.yml` 的 cloudflared 服务（已内置示例）：
```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: quickshare-cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run --token ${CF_TUNNEL_TOKEN}
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
    networks:
      - html-go-network
    depends_on:
      - nginx-proxy
```

3) 重启 cloudflared：
```bash
docker compose up -d --build cloudflared
```

说明：Compose 的变量插值只读取 `.env` 或当前 shell 环境，不会使用 `env_file` 的变量；因此请将 token 放在 `./.env` 或在执行前 `export CF_TUNNEL_TOKEN=...`。

### 步骤 10: 访问应用

通过 Nginx 访问（推荐，同 ngrok 入口）：[http://localhost:8081](http://localhost:8081)

您应该会看到应用的登录页面（如果启用认证）。

## 4. 项目功能详解

- **代码片段分享**:
  - **适用场景**: 快速与他人分享一段 HTML、Markdown 或 Mermaid 代码，而无需发送整个文件。
  - **使用方法**: 在首页的编辑器中粘贴或输入代码，点击“创建分享链接”即可生成一个唯一的 URL。

- **密码保护**:
  - **适用场景**: 当分享的代码包含敏感信息或仅希望特定人员查看时。
  - **使用方法**: 在创建分享链接时，勾选“密码保护”选项，系统会自动生成一个随机密码并与链接一同显示。

- **用户认证**:
  - **适用场景**: 限制代码创建功能，只允许授权用户使用，防止公开访问时被滥用。
  - **使用方法**: 在 `.env` 文件中将 `AUTH_ENABLED` 设为 `true` 并设置密码。

- **最近页面查看**:
  - **适用场景**: 快速找回最近创建和分享过的代码片段。
  - **使用方法**: 登录后，在页面上可以找到“最近”或类似的链接，点击即可查看列表。

## 5. 使用示例

### 示例 1: 分享一个简单的 HTML 页面

1. **启动应用**: 确保应用已通过 `npm run dev` 成功启动。
2. **访问首页**: 在浏览器中打开 [http://localhost:3000](http://localhost:3000) 并登录。
3. **输入代码**: 在编辑器中输入以下 HTML 代码：

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <title>我的第一个分享</title>
       <style>
           body { font-family: sans-serif; text-align: center; padding-top: 50px; }
           h1 { color: #3498db; }
       </style>
   </head>
   <body>
       <h1>你好，QuickShare！</h1>
       <p>这是一个通过 QuickShare 分享的简单 HTML 页面。</p>
   </body>
   </html>
   ```

4. **创建链接**: 点击“创建分享链接”按钮。
5. **获取链接**: 页面会显示生成的分享链接，例如 `http://localhost:3000/v/abcdef`。
6. **分享与查看**: 将此链接发送给他人。他们访问该链接即可看到渲染后的 HTML 页面。

### 示例 2: 分享一份带密码保护的 Mermaid 流程图

1. **输入代码**: 在编辑器中输入以下 Mermaid 代码来描述一个简单的流程图：

   ```mermaid
   graph TD;
       A[开始] --> B{检查条件};
       B -- 是 --> C[执行操作];
       B -- 否 --> D[结束];
       C --> D;
   ```

2. **设置密码**: 勾选“密码保护”复选框。
3. **创建链接**: 点击“创建分享链接”。
4. **获取链接和密码**: 页面会同时显示分享链接（如 `http://localhost:3000/v/ghijkl`）和访问密码（如 `password123`）。
5. **分享与查看**: 将链接和密码一并发送给他人。访问者需要先输入正确的密码，才能看到渲染后的流程图。

## 6. 如何与他人分享

### 本地 Docker + ngrok（后台常驻）

本项目内置了 `ngrok` 与 `Cloudflare Tunnel` 两种隧道容器，均支持后台常驻。通过 Compose `profiles` 可选择性启用。

**1) 准备 `.env.ngrok`**

在项目根目录创建 `.env.ngrok`（可参考 `.env.ngrok.example`）。内容如下：

```
NGROK_AUTHTOKEN=你的_authtoken
# 如果你有付费预留域名，可同时设置：
# NGROK_DOMAIN=your-reserved-subdomain.ngrok.app
```

**2) 启动基础服务（应用 + Nginx）**

```bash
docker compose up -d --build
```

**3) 启动隧道（任选其一）**

- Cloudflare（推荐、免费、无提示页）：

```bash
npm run share:cf:up
```

- ngrok（免费域名可能出现提示页；预留域名可免）：

```bash
npm run share:ngrok:up
```

**4) 获取公网 URL**

容器启动后，获取对应的公网地址：

```bash
# Cloudflare 地址
npm run cf:url
```

# ngrok 地址
npm run ngrok:url
```

返回的地址如 `https://xxxx.trycloudflare.com` 或 `https://xxxx.ngrok-free.app` 即为公网分享链接。

**4) 关闭/重启**

```bash
docker compose stop      # 停止但保留容器
docker compose start     # 重新启动
docker compose down      # 删除容器
```

> 说明：Compose 的 `restart: unless-stopped` 会在系统重启后自动拉起容器（Docker Desktop 开机自启时）。

## 7. 消除 ngrok “Visit Site” 提示（最终方案）

### 根因分析（为什么加 Nginx 头无效？）

ngrok 的提示页是在 ngrok 边缘节点决定是否把请求“转发给你”的服务器之前触发的。所谓的“跳过提示页”需要浏览器在发送到 ngrok 的“首个请求”中包含自定义请求头 `ngrok-skip-browser-warning`。而我们在 Nginx 里设置的是“发往上游应用的请求头”（ngrok → Nginx → 应用），这个时机已经太晚了，ngrok 在看到该头之前就已经拦截并返回了提示页。因此，无论反向代理如何设置，都无法从服务端消除这个提示。

### 可行方案

- 付费方案（推荐，最省心）：使用 ngrok 的“预留域名（Reserved Domain）/ 自定义域名”。在该场景下，提示页不再出现。
  - 在 ngrok 控制台创建预留域名，例如 `yourname.ngrok.app`；
  - 在 `ngrok.yml` 中取消注释 `domain:` 一行，填入你的域名；
  - 重新执行 `docker compose up -d`。

- 免费方案（客户端侧绕过，仅适合自测）：让客户端请求带上头部 `ngrok-skip-browser-warning`（例如使用 curl 或浏览器扩展添加请求头）。此方法仅对“会设置该头的客户端”有效，不适合对外分享。

> 结论：服务器侧（Nginx/应用）无法单方面去掉提示页；要么使用 ngrok 的预留域名，要么让客户端发送该请求头。

## 8. 免费无提示页替代：Cloudflare Tunnel（推荐）

Cloudflare 提供“Quick Tunnel”免费通道，无需账号/域名即可获得 `*.trycloudflare.com` 公网地址，默认无类似 ngrok 的提示页。我们已内置 `cloudflared` 容器，后台常驻运行；并通过 Compose `profiles` 可按需启用。

**1) 启动**

```bash
docker compose up -d --build
```

**2) 获取公网 URL**

- 方式 A：命令输出

```bash
npm run cf:url
```

- 方式 B：查看日志

```bash
docker logs quickshare-cloudflared --since 1h | grep trycloudflare
```

输出类似：`https://xxxx-xxxx.trycloudflare.com`。

**3) 访问**

- 公网：使用上一步获取的 `https://*.trycloudflare.com`
- 本地：`http://localhost:8081`

**说明与限制**
- Quick Tunnel 随启随用、免费，但域名是临时随机的，重启后会变化；
- 如需固定子域名，可使用 Cloudflare 免费账号 + 自有域名创建“命名隧道”（Argo Tunnel），仍为免费层使用且无提示页；
- 与 ngrok 相比：无需客户端额外请求头，分享链接直接可用。

## 9. 注意事项

- **数据库文件**: 项目使用 SQLite，数据库文件默认存储在项目根目录下的 `db/` 文件夹中。请确保该目录具有写入权限。
- **会话文件**: 用户会话信息存储在 `sessions/` 文件夹中，同样需要写入权限。
- **安全提示**: 如果您计划将此工具部署到公共网络，请务必将 `AUTH_ENABLED` 设置为 `true`，并使用一个足够强度的 `AUTH_PASSWORD`，以防止未经授权的访问。

### 9.1 生产环境数据持久化（强烈建议）

默认生产环境会将数据库写入 `/tmp/html-go.db`（为 Serverless 场景设计），容器重建可能导致数据丢失。建议改用挂载卷路径：

1) 在 `.env.production` 设置：
```
DB_PATH=/usr/src/app/data/html-go.db
```

2) Compose 已挂载：
```yaml
volumes:
  - html-go-data:/usr/src/app/data
```

3) 重建应用容器：
```bash
docker compose up -d --build html-go-express
```

4) 如需迁移旧数据（曾在 `/tmp/html-go.db`）：
```bash
# 方式 A：一键脚本（容器内执行）
npm run db:migrate:volume

# 方式 B：自定义参数
docker compose exec html-go-express node scripts/migrate-db-to-volume.js \
  --src=/tmp/html-go.db \
  --dest=/usr/src/app/data/html-go.db \
  --force
```

## 10. Vercel 托管（已支持免费持久化）

- 现状：已在代码中支持根据环境切换为云端 Postgres + Cookie 会话，避免临时存储导致分享链接很快失效。
- 配置（Vercel 环境变量）：
  - `DATABASE_URL`：Neon/Supabase 等 Postgres 连接串
  - `SESSION_SECRET`：随机强密钥
  - 可选：`SESSION_STRATEGY=cookie`（手动指定 Cookie 会话；检测到 `DATABASE_URL`/`VERCEL` 时会自动启用）
- 详情见 `VERCEL_PLAN.md`。

### 10.1 操作步骤（从零开始）
1) 获取数据库连接串（任选其一）：
   - Vercel + Neon 集成：Project → Integrations → 搜 “Neon” → 安装并关联项目（会自动写入环境变量）。
   - Neon/Supabase 手动：在控制台创建项目，复制 `postgresql://user:pass@host/db?sslmode=require`。
   - Vercel Postgres：Project → Storage → Add Postgres，完成后在环境变量新增 `DATABASE_URL=${POSTGRES_URL_NON_POOLING}`（或 `${POSTGRES_URL}`）。
2) 在 Vercel → Project → Settings → Environment Variables：
   - 在 Production（和 Preview，如需）新增：`DATABASE_URL`、`SESSION_SECRET`；可选 `AUTH_ENABLED`/`AUTH_PASSWORD`。
3) Redeploy 当前项目。

### 10.2 环境变量填写示例
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
SESSION_SECRET=openssl-rand-base64-32-output
# 可选
AUTH_ENABLED=true
AUTH_PASSWORD=admin123
# 可选（通常不需要显式设置）
# SESSION_STRATEGY=cookie
```

### 10.3 验证持久化是否生效
- 部署日志包含：
  - “数据库初始化成功（Postgres）”
  - “[Session] 使用 cookie-session”
- 创建一个分享链接，过一段时间重新部署或触发实例重启后仍能访问，即为持久化成功。

### 10.4 常见问题（Vercel）
- 无法连接数据库 / 超时：
  - 确认 `DATABASE_URL` 正确且包含 `sslmode=require`（Neon/Supabase 通常要求）。
  - 如提供方不支持 SSL，可临时设置 `PGSSL_DISABLE=1`（不建议长期关闭）。
- 仍然丢数：
  - 检查是否确实设置了 `DATABASE_URL` 并 Redeploy；未设置时会退回 SQLite（在 Vercel 上为临时存储）。
- 预览环境未持久化：
  - 需要在 Preview 环境同样添加 `DATABASE_URL` 与 `SESSION_SECRET`。
