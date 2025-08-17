# QuickShare 公网分享方案总览

本项目提供三种分享方式：

- Cloudflare Tunnel（主推，免费、无提示页）
- ngrok（备选，免费域名会有“Visit Site”提示页）
- Vercel（云端发布，不需要隧道；当前为临时存储，见后期计划）

下述命令均在项目根目录执行。

## 1) 启动基础服务（应用 + 反向代理）

```bash
docker compose up -d --build
```

本地访问入口：`http://localhost:8081`

## 2) Cloudflare（推荐，免费、无提示页）

### 使用您自己的域名

**1. 创建命名隧道并获取令牌**

- **安装 `cloudflared`：** 如果您还没有安装，请按照 [此处的说明](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 进行安装。
- **登录 `cloudflared`：** 打开终端并运行以下命令：
  ```bash
  cloudflared tunnel login
  ```
  这将打开一个浏览器窗口，要求您登录您的 Cloudflare 账户并授权 `cloudflared`。
- **创建隧道：** 运行以下命令来创建名为 `quickshare` 的隧道：
  ```bash
  cloudflared tunnel create quickshare
  ```
  此命令将输出一个隧道 ID 和一个 JSON 文件的路径。
- **配置隧道：** 运行以下命令，将您的域名路由到隧道：
  ```bash
  cloudflared tunnel route dns quickshare share.dhammaai.com
  ```
- **获取隧道令牌：** 运行以下命令以获取隧道的令牌：
  ```bash
  cloudflared tunnel token quickshare
  ```
  复制此命令输出的令牌。

**2. 更新 `docker-compose.yml` 与 Ingress 配置（必读）**

打开 `docker-compose.yml` 文件，找到 `cloudflared` 服务并将其 `command` 更新为以下内容，将 `<YOUR_TUNNEL_TOKEN>` 替换为您在上一步中获得的令牌：

1) 在项目内新增并确认 `cloudflared/config.yml`：

```yaml
ingress:
  - hostname: share.dhammaai.com
    service: http://nginx-proxy:80
  - service: http_status:404
```

2) 在 `docker-compose.yml` 中挂载该配置，并显式使用：

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

> 重要：若不提供 Ingress 规则，cloudflared 会返回 503。日志会包含 `No ingress rules were defined...` 的警告。

**3. 启动服务**

```bash
docker compose up -d --build
```

### 使用快速隧道（临时）

- 启动：

```bash
docker compose up -d --build
```

- 获取公网地址：

```bash
npm run cf:url
```

输出形如 `https://xxxx.trycloudflare.com`，可直接分享（中国大陆多数网络可访问，无提示页）。快速隧道无需命名隧道 token，但仍建议提供 Ingress 以确保上游路由清晰。

**注意：** 由于 `trycloudflare.com` 是一个免费的临时域名，某些浏览器（如 Chrome）可能会显示安全警告。对于测试，可以安全地忽略此警告。对于生产环境，建议使用您自己的域名和 Cloudflare 的命名隧道。

- 停止：

```bash
docker compose down
```

提示：Quick Tunnel 的域名是临时的，重启后可能变化。若需固定子域名，可使用 Cloudflare 免费账号 + 自有域名创建“命名隧道”（Argo Tunnel）。

## 3) ngrok（备选）

免费域名会出现“Visit Site”提示页；只有付费预留域名/自定义域名可消除。

- 准备环境变量：复制 `.env.ngrok.example` 为 `.env.ngrok`，设置 `NGROK_AUTHTOKEN=...`。

- 当前仓库的 compose 未内置 ngrok 容器，如需以容器方式运行，可参考：

```bash
docker run -d --name ngrok-agent \
  --network $(docker network ls --format '{{.Name}}' | grep html-go-network) \
  -e NGROK_AUTHTOKEN=你的_authtoken \
  -p 4040:4040 \
  ngrok/ngrok:latest http nginx-proxy:80
```

然后通过：

```bash
npm run ngrok:url
```

若你有付费预留域名，可在自建 `ngrok.yml` 中设置 `domain:`，或直接在 ngrok 控制台配置；免费域名默认存在“Visit Site”提示页，服务端无法移除。

## 4) Vercel（云端发布）

将项目推至 GitHub 后，通过 Vercel 自动部署。当前版本使用本地 SQLite + 文件会话，在 Vercel 函数环境下属于“临时存储”。若需“免费持久化”，请参考 `VERCEL_PLAN.md` 的后期计划（Neon Postgres + Cookie 会话，免费层）。

## 5) 中国网络可达性建议

- Cloudflare Tunnel 的 `*.trycloudflare.com` 在多数网络可达，偶发延迟波动；整体体验优于 ngrok 免费域名。
- ngrok 免费域名在国内可达性较差，分享体验不稳定；如需使用，建议购买预留域名。
- 若追求极致稳定的大陆访问，可考虑国内隧道（cpolar/natapp/花生壳）或自建 FRP 指向国内云主机（非零成本）。

## 6) 后台常驻与自启动

- Compose 中各服务使用 `restart: unless-stopped`，关闭终端不影响运行，并可随 Docker Desktop 开机自启自动拉起。

## 7) 安全与运维提示

- 不要将密钥提交到仓库：`.env.ngrok` 已加入 `.gitignore`。
- 如曾泄露 ngrok token，请在 ngrok 控制台重置。
- 建议启用 `AUTH_ENABLED=true` 并设置强密码，避免未授权创建内容。

## 8) 常见问题

- 4040 或 8787 端口被占用：修改 `docker-compose.yml` 对应端口映射或释放占用。
- `npm run cf:url` 无输出：容器可能尚未就绪，等待数秒后重试；或使用 `docker logs quickshare-cloudflared --since 1h | grep trycloudflare`。
- ngrok 仍出现提示页：属免费域名的产品策略，服务端无法绕过；付费预留域名或改用 Cloudflare。
