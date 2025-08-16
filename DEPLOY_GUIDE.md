# QuickShare 部署与使用指南 (macOS M2)

## 1. 项目概述

QuickShare 是一个基于 Node.js 和 Express.js 开发的在线代码分享工具。它允许用户快速创建、分享和查看 HTML、Markdown、SVG 以及 Mermaid 图表代码片段。该工具界面现代化，支持响应式设计，并提供密码保护、用户认证和会话管理等安全功能，确保代码分享的安全与便捷。

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
AUTH_PASSWORD=Qq112211
DB_PATH=./db/database.sqlite
```
**说明**: 我们已将端口设置为 `3003`，并将您的登录密码设置为 `Qq112211`。

### 步骤 6: 修改 Docker Compose 配置

打开 `quickshare/docker-compose.yml` 文件，将其修改为以下内容，以确保它能正确加载我们的 `.env.production` 文件并映射正确的端口。

```yaml
services:
  html-go-express:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: html-go-express
    restart: unless-stopped
    ports:
      - "3003:3003"
    volumes:
      - html-go-data:/usr/src/app/data
    env_file:
      - .env.production
    networks:
      - html-go-network

volumes:
  html-go-data:
    driver: local

networks:
  html-go-network:
    driver: bridge
```

### 步骤 7: 使用 Docker 构建并启动应用

现在，一切准备就绪。执行以下命令来构建并启动 Docker 容器。`--build` 参数会强制 Docker 重新构建镜像，以应用我们所有的代码和配置修复。

```bash
# 确保您在 quickshare 目录下
cd /Users/dhammavipassi/Github_projects/quickshare

# 构建并启动服务
docker-compose up -d --build
```

**预期输出**:
您会看到 Docker 构建镜像并启动容器的日志。成功后，服务将在后台运行。

### 步骤 8: 访问应用

打开您的网络浏览器，访问：[http://localhost:3003](http://localhost:3003)

您应该会看到应用的登录页面。请输入密码 `Qq112211` 以登录。

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

## 6. 如何与他人分享 (方案对比)

我们为您提供了两种将本地服务分享到公网的方案，各有优劣。

### 方案一：本地 Docker + ngrok (首推，性能与体验最佳)

这个方案直接将您本地运行的 Docker 容器通过 `ngrok` 暴露到公网。

-   **优点**:
    -   **极速响应**: 由于应用在本地持续运行，没有“冷启动”延迟，访问速度飞快。
    -   **数据持久化**: 所有数据都存储在您本地的 Docker volume 中，不会丢失。
    -   **完全控制**: 您对本地环境有完全的控制权。
-   **缺点**:
    -   需要您的电脑保持开机和联网状态。
    -   **免费版 ngrok 的“Visit Site”提示**: 新访客首次访问时，会看到一个需要手动点击的提示页面。**这是免费套餐的安全特性，可以通过升级到 ngrok 付费版来去除**，以获得最佳的直达访问体验。

**操作步骤**:

**1. 确保 Docker 应用正在运行**
   ```bash
   # 进入项目目录
   cd /Users/dhammavipassi/Github_projects/quickshare
   # 启动服务
   docker-compose up -d
   ```

**2. 在后台启动 ngrok (使用 nohup)**

为了确保关闭终端后 `ngrok` 服务能继续运行，我们使用 `nohup` 命令。

   ```bash
   # 进入项目目录
   cd /Users/dhammavipassi/Github_projects/quickshare
   
   # 确保没有旧的 ngrok 进程在运行
   pkill ngrok
   
   # 使用 nohup 在后台启动 ngrok
   nohup ngrok start --config ngrok.yml --log=stdout quickshare-tunnel > ngrok.log 2>&1 &
   ```

**3. 获取公共链接**

由于服务在后台运行，您需要通过查看日志文件 `ngrok.log` 来获取公共链接。

   ```bash
   # 查看日志并找到链接
   cat /Users/dhammavipassi/Github_projects/quickshare/ngrok.log
   ```
   在日志中，找到类似 `url=https://xxxx.ngrok-free.app` 的信息，这就是您的公共分享链接。

**4. 如何停止后台 ngrok 服务**

当您不再需要分享时，可以运行以下命令来终止后台的 `ngrok` 进程。

   ```bash
   pkill ngrok
   ```

**1. 安装 ngrok:**
在 macOS 上，最简单的方式是使用 Homebrew 安装。
```bash
brew install ngrok
```

**2. 注册并获取 Authtoken:**
访问 [ngrok 官网](https://dashboard.ngrok.com/signup) 注册一个免费账户，然后在您的仪表板上找到 Authtoken。执行以下命令进行配置（只需配置一次）：
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```
将 `YOUR_AUTHTOKEN_HERE` 替换为您自己的 Authtoken。

**3. 启动穿透:**
首先，确保您的 QuickShare 应用正在本地运行（例如，通过 `npm run dev` 运行在 3000 端口）。然后，打开一个新的终端窗口，运行以下命令：
```bash
ngrok http 3000
```

**4. 获取分享链接:**
`ngrok` 会生成一个公网可以访问的 URL，通常以 `https://` 开头。在终端输出中找到 `Forwarding` 这一行，将这个 URL 分享给他人即可。

### 方案二：部署到 Vercel (备选，免费托管，有“冷启动”延迟)

**Vercel 部署的最终修复**:

我们发现，即使在代码中指定了 `/tmp` 目录，应用在 Vercel 上仍然会因为尝试创建 `db` 和 `sessions` 目录而失败。最终的解决方案是**完全移除**这些创建目录的逻辑，因为在 Serverless 环境下，我们应该假定 `/tmp` 目录永远存在且可写。

请确保您的 `quickshare/models/db.js` 和 `quickshare/app.js` 文件已经包含了我们最终的修复代码。

**Vercel 部署的最终修复**:

我们发现，即使在代码中指定了 `/tmp` 目录，应用在 Vercel 上仍然会因为尝试创建 `db` 和 `sessions` 目录而失败。最终的解决方案是**完全移除**这些创建目录的逻辑，因为在 Serverless 环境下，我们应该假定 `/tmp` 目录永远存在且可写。

请确保您的 `quickshare/models/db.js` 和 `quickshare/app.js` 文件已经包含了我们最终的修复代码。

为了获得一个永久的、稳定的分享链接，您可以将此应用部署到云平台。考虑到您在中国大陆，需要寻找在国内可以稳定访问且提供免费套餐的服务。

以下是一些值得考虑的成熟方案：

- **[Zeabur](https://zeabur.com/)**:
  - **优点**: 对国内用户非常友好，网络访问速度快。提供“开发者”免费套餐，每月有 5 美元的赠金，足够托管像 `quickshare` 这样的小型应用。支持直接从 GitHub 仓库部署，并且能自动识别 `Dockerfile`，部署流程非常顺滑。
  - **缺点**: 免费额度有限，超出部分需要付费。

- **[Vercel](https://vercel.com/)**:
  - **优点**: 拥有全球 CDN 网络，虽然服务器在海外，但国内访问速度尚可。其“Hobby”套餐对个人非商业项目完全免费，且额度相当慷慨。与 GitHub 集成极佳，每次代码推送都能自动触发部署。
  - **缺点**: 偶尔在国内部分地区可能会有访问不稳定的情况。构建环境在国内可能较慢。

- **国内云服务商的免费试用**:
  - **阿里云 / 腾讯云**: 它们经常为新用户提供长达数月甚至一年的免费云服务器（ECS）或轻量应用服务器试用。
  - **优点**: 服务器位于国内，访问速度极快且稳定。
  - **缺点**: 免费期结束后需要付费。配置服务器需要一些基础的 Linux 运维知识，但由于本项目有 `Dockerfile`，您可以直接在服务器上安装 Docker 来运行，大大简化了部署难度。

**推荐方案**:
对于 `quickshare` 这个项目，**Zeabur** 是一个非常理想的起点，因为它在免费、易用和国内访问速度之间取得了很好的平衡。

### 方案实践：部署到 Vercel

**重要提示：关于数据库的局限性**

Vercel 是一个 Serverless（无服务器）平台，其文件系统是**临时的（Ephemeral）**。这意味着每次应用部署或休眠后重启，文件系统都会被重置。

`quickshare` 项目默认使用 **SQLite** 数据库，它将所有数据存储在一个文件中。因此，当部署到 Vercel 时，**您创建的所有分享链接都会在应用重启后丢失**。

这个方案适用于**演示、测试或临时分享**。如果您需要数据的持久化存储，建议将数据库更换为云数据库（如 Vercel Postgres、MongoDB Atlas 等），但这需要对代码进行更深入的改造。

**部署步骤：**

**1. 将代码推送到 GitHub 仓库**
   - 确保您已经将 `quickshare` 项目的所有文件（包括我们修复过的代码和新创建的 `vercel.json`）上传到了您自己的一个 GitHub 仓库中。

**2. 注册并登录 Vercel**
   - 访问 [Vercel 官网](https://vercel.com/)，使用您的 GitHub 账户进行注册和登录。

**3. 导入您的项目**
   - 登录后，在 Vercel 的仪表板（Dashboard）上，点击 “Add New...” -> “Project”。
   - 在 “Import Git Repository” 列表中，找到并选择您刚刚上传了 `quickshare` 代码的 GitHub 仓库，然后点击 “Import”。

**4. 配置项目**
   - Vercel 会自动检测到这是一个 Node.js 项目。您无需修改 “Build and Output Settings”。
   - 展开 “Environment Variables”（环境变量）部分，这是最关键的一步。添加以下三个变量：
     - **`PORT`**: `3003`
     - **`AUTH_ENABLED`**: `true`
     - **`AUTH_PASSWORD`**: `Qq112211`
   - **注意**: `DB_PATH` 变量我们不需要在这里设置，因为应用会默认在临时文件系统中创建数据库文件。

**5. 部署**
   - 点击 “Deploy” 按钮。
   - Vercel 会开始拉取您的代码、安装依赖、构建并部署应用。整个过程通常需要 1-2 分钟。

**6. 访问您的应用**
   - 部署成功后，Vercel 会为您生成一个唯一的、以 `.vercel.app` 结尾的公共 URL。
   - 点击这个 URL，您就可以在公网上访问您的 `quickshare` 应用了。

## 9. 注意事项

- **数据库文件**: 项目使用 SQLite，数据库文件默认存储在项目根目录下的 `db/` 文件夹中。请确保该目录具有写入权限。
- **会话文件**: 用户会话信息存储在 `sessions/` 文件夹中，同样需要写入权限。
- **安全提示**: 如果您计划将此工具部署到公共网络，请务必将 `AUTH_ENABLED` 设置为 `true`，并使用一个足够强度的 `AUTH_PASSWORD`，以防止未经授权的访问。