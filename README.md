# HTML 代码分享工具 (Express 版本)

这是一个基于 Node.js + Express 开发的代码分享工具，允许用户创建、分享和查看 HTML、Markdown、SVG、Mermaid 图表等代码片段。支持密码保护、登录门禁（可开关）、会话管理和现代化 UI。提供 Docker Compose + Nginx 反代 + Cloudflare Tunnel（命名隧道）的一键部署方案，并可通过自定义域名上线（如 `share.dhammaai.com`）。

## 功能特点

- **HTML代码片段创建和分享**：轻松创建和分享HTML代码
- **密码保护功能**：可选择为代码片段设置密码保护
- **用户认证系统**：支持登录认证，保护创建功能
- **响应式设计**：现代化的用户界面，支持移动端
- **会话管理**：安全的会话存储和管理
- **最近页面查看**：快速访问最近创建的页面

## 技术栈

- **后端框架**：Node.js + Express.js
- **模板引擎**：EJS
- **数据库**：SQLite3
- **会话存储**：文件存储 (session-file-store)
- **其他依赖**：
  - body-parser：请求体解析
  - cors：跨域资源共享
  - crypto-js：加密功能
  - dotenv：环境变量管理
  - morgan：HTTP请求日志
  - marked：Markdown解析
  - mermaid：图表渲染

## 项目结构

```
html-go-express/
├── app.js                    # 应用程序入口文件
├── package.json              # 项目依赖和脚本
├── config.js                 # 配置文件
├── .env                      # 环境变量（需要创建）
├── config/                   # 配置目录
├── models/                   # 数据模型
│   ├── db.js                # 数据库初始化
│   └── pages.js             # 页面数据模型
├── routes/                   # 路由处理
│   └── pages.js             # 页面路由
├── views/                    # EJS模板文件
│   ├── layout.ejs           # 布局模板
│   ├── index.ejs            # 首页模板
│   ├── login.ejs            # 登录页面
│   ├── password.ejs         # 密码验证页面
│   ├── error.ejs            # 错误页面
│   └── partials/            # 模板片段
├── public/                   # 静态资源
├── middleware/               # 中间件
│   └── auth.js              # 认证中间件
├── utils/                    # 工具函数
├── scripts/                  # 脚本文件
├── db/                       # 数据库文件
├── sessions/                 # 会话文件存储
├── Dockerfile               # Docker配置
├── docker-compose.yml       # Docker Compose配置
├── nginx.conf               # Nginx反向代理配置
└── README.md                # 项目说明
```

## 快速开始（Docker + Cloudflare 命名隧道 + 自定义域名）

以下步骤将以 `share.dhammaai.com` 为例，使用 Cloudflare 命名隧道直达本项目 Nginx 反向代理，无浏览器“提示页”。

1) 准备环境
- 安装 Docker Desktop
- 拥有 `dhammaai.com` 并接入 Cloudflare（DNS 由 Cloudflare 代管）

2) 创建命名隧道并绑定域名（本机安装 cloudflared）
```bash
cloudflared tunnel login               # 浏览器完成授权
cloudflared tunnel create quickshare   # 创建隧道（记录隧道名）
cloudflared tunnel route dns quickshare share.dhammaai.com
cloudflared tunnel token quickshare    # 复制输出的 token
```

3) 配置项目环境变量和隧道 Ingress
- 复制 `.env.production.example` 为 `.env.production`，根据需要修改端口/认证：
```
NODE_ENV=production
PORT=3003
AUTH_ENABLED=true
AUTH_PASSWORD=<你的密码>
# 可选：若你不想把 token 写进 compose，可在这里提供
# CF_TUNNEL_TOKEN=<你的 cloudflared token>
```
- 确认已存在 Ingress 配置：`cloudflared/config.yml`
```yaml
ingress:
  - hostname: share.dhammaai.com
    service: http://nginx-proxy:80
  - service: http_status:404
```
说明：这一步是避免 503 的关键。没有 Ingress 规则，cloudflared 会将所有请求返回 503。

4) 启动（首次会自动构建镜像）
```bash
docker compose up -d --build
```

5) 验证
```bash
# 查看隧道日志（应无 No ingress rules… 警告）
docker logs -f quickshare-cloudflared

# 本地反代
open http://localhost:8081

# 自定义域名
open https://share.dhammaai.com
```

注意（Compose 变量插值）：将 token 写入项目根目录的 `.env`（被 .gitignore 忽略），Compose 会在解析 `docker-compose.yml` 时用 `${CF_TUNNEL_TOKEN}` 进行替换：
```dotenv
# ./.env
CF_TUNNEL_TOKEN=xxxx
```
```yaml
# docker-compose.yml
command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run --token ${CF_TUNNEL_TOKEN}
```
说明：`env_file` 注入的变量不会用于 Compose 的变量插值；如需仅容器内可见而不暴露在 compose 命令中，可改用“命名隧道 + credentials-file”方案。

### 环境变量文件管理（安全）
- 本地运行与 Compose：
  - `.env`（包含 `CF_TUNNEL_TOKEN`）：已被忽略，勿入库。
  - `.env.production`：从 `.env.production.example` 复制生成，勿入库。
- 如曾误提交敏感文件，先取消追踪（不会删除本地文件）：
```bash
git rm --cached .env .env.production cert.pem
git add . && git commit -m "chore: ignore secrets and add env example"
```

更多部署细节、疑难排查与替代方案见 [`DEPLOY_GUIDE.md`](DEPLOY_GUIDE.md) 与 [`SHARE_GUIDE.md`](SHARE_GUIDE.md)。

## 本地开发（非 Docker）

1. 安装依赖
```bash
npm install
```
2. 配置环境
```bash
cp .env.example .env   # 或手动创建 .env
```
3. 启动开发模式
```bash
npm run dev
```

## 使用说明

### 1. 访问应用
- 打开浏览器访问 http://localhost:3000
- 如果启用了认证，需要先登录

### 2. 创建HTML页面
1. 在首页的编辑器中输入HTML代码
2. 选择是否设置密码保护
3. 点击"创建分享链接"按钮
4. 获得分享链接，可以分享给其他人

### 3. 查看分享的页面
- 通过分享链接访问页面
- 如果设置了密码保护，需要输入密码才能查看

## API 接口

### 1. 创建页面
- **路径**：`POST /api/pages/create`
- **功能**：创建新的HTML页面
- **认证**：需要登录
- **参数**：
  ```json
  {
    "htmlContent": "HTML代码内容",
    "isProtected": true/false
  }
  ```
- **返回**：
  ```json
  {
    "success": true,
    "urlId": "页面ID",
    "password": "密码（如果设置了保护）",
    "isProtected": true/false
  }
  ```

### 2. 获取页面
- **路径**：`GET /api/pages/:id`
- **功能**：获取指定ID的页面内容
- **参数**：
  - `id`: 页面ID
  - `password`: 密码（如果页面受保护）

### 3. 获取最近页面
- **路径**：`GET /api/pages/recent`
- **功能**：获取最近创建的页面列表
- **认证**：需要登录

## 配置选项

在 `config.js` 中可以配置：

- `port`: 服务器端口
- `authEnabled`: 是否启用认证
- `authPassword`: 登录密码
- `dbPath`: 数据库文件路径（运行时实际由环境变量 `DB_PATH` 控制；未设置时按环境回退：生产优先 `/tmp/html-go.db`，否则 `db/html-go.db`）
- `logLevel`: 日志级别

## 安全特性

- **会话管理**：使用文件存储的安全会话
- **密码保护**：支持为页面设置访问密码
- **认证系统**：保护页面创建功能
- **CORS支持**：安全的跨域请求处理
- **输入验证**：防止恶意输入

## 开发和部署

### 开发模式
```bash
npm run dev
```
使用 nodemon 自动重启，便于开发调试。

### 生产部署（Docker 推荐）
- Compose 编排：`html-go-express`（应用） + `nginx-proxy`（反代，8081:80） + `cloudflared`（命名隧道）。
- 配置文件：`cloudflared/config.yml` 必须包含将你的域名指向 `http://nginx-proxy:80` 的 Ingress 规则。
- 详细步骤与故障排查：见 `DEPLOY_GUIDE.md`。

#### 数据持久化（强烈建议）
- 将数据库放入持久化卷：在 `.env.production` 设置
```
DB_PATH=/usr/src/app/data/html-go.db
```
Compose 已挂载 `html-go-data:/usr/src/app/data`，数据即可跨容器重建保留。若之前运行在 `/tmp/html-go.db`，可按需迁移旧数据（从旧容器拷出再放入卷）。

##### 迁移旧数据库到持久化卷（可选）
- 一键（容器内执行）：
```bash
## 若脚本已包含在容器镜像中（已重建过），可直接：
npm run db:migrate:volume

## 若容器尚未重建，脚本还不在容器内：使用热拷贝 + 执行
npm run db:migrate:volume:hot -- --src=/tmp/html-go.db --dest=/usr/src/app/data/html-go.db --force
```
- 自定义参数示例：
```bash
docker compose exec html-go-express node scripts/migrate-db-to-volume.js \
  --src=/tmp/html-go.db \
  --dest=/usr/src/app/data/html-go.db \
  --force
```

### 公网分享与替代
- Cloudflare 隧道（推荐）：无提示页、免费，详见 `SHARE_GUIDE.md`。
- ngrok（备选）：免费域名存在“Visit Site”提示页；如需消除需使用预留域名；当前 compose 未内置 ngrok 服务，如需使用见 `SHARE_GUIDE.md` 提供的示例命令。
- Vercel：已支持免费持久化（Postgres + Cookie 会话）。在 Vercel 项目设置 `DATABASE_URL` 与 `SESSION_SECRET` 即可启用；详见 `VERCEL_PLAN.md`。

### 流量走向（示意）

本地直连（开发/内网）：
```
浏览器 → http://localhost:8081 → Nginx(容器: nginx-proxy:80) → Express(容器: html-go-express:3003)
```

Cloudflare 命名隧道（推荐公网）：
```
浏览器(https://share.dhammaai.com)
  → Cloudflare 边缘
  → cloudflared(容器)
  → Nginx(容器: nginx-proxy:80)
  → Express(容器: html-go-express:3003)
```

ngrok（备选公网）：
```
浏览器(https://*.ngrok.app)
  → ngrok 边缘
  → ngrok agent（容器/本机）
  → Nginx(容器: nginx-proxy:80 或本机 http://localhost:8081)
  → Express(容器: html-go-express:3003)
```

## 故障排除

### 常见问题

1. **端口占用错误**
   - 检查端口是否被其他程序占用
   - 修改 `.env` 文件中的 PORT 配置

2. **数据库连接错误**
   - 确保 `db` 目录存在且有写权限
   - 检查 `DB_PATH` 配置是否正确

3. **会话存储错误**
   - 确保 `sessions` 目录存在且有读写权限
   - 检查磁盘空间是否充足

4. **认证问题**
   - 检查 `AUTH_PASSWORD` 是否正确设置
   - 清除浏览器 Cookie 和会话数据

5. **Cloudflared 返回 503（最常见）**
   - 日志出现 `No ingress rules were defined... cloudflared will return 503`：
     - 确认 `cloudflared/config.yml` 存在且被容器挂载到 `/etc/cloudflared/config.yml`。
     - 确认 `ingress` 中的 `hostname` 与访问域名一致，`service` 指向 `http://nginx-proxy:80`。
     - 重启隧道容器：`docker compose up -d --build cloudflared`。

6. **自定义域名解析异常**
   - Cloudflare 控制台中 `share.dhammaai.com` CNAME 已路由至隧道（命名隧道记录）。
   - Zero Trust → Tunnels 中可见隧道在线，且有该域名的路由项。

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

ISC License

---
变更记录（要点）
- 新增命名隧道 Ingress 配置与说明，解决 503 问题。
- 补充 Docker + Cloudflare 自定义域名的端到端步骤与安全建议（token 放入环境变量）。

## 更新日志

- v1.0.0: 初始版本，基本的HTML分享功能
- 支持密码保护和用户认证
- 添加Docker支持
- 优化用户界面和体验 
