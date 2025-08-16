FROM node:20-alpine

# 创建应用目录
WORKDIR /usr/src/app

# 安装应用依赖
# 使用通配符确保 package.json 和 package-lock.json 都被复制
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用程序代码
COPY . .

# 创建数据目录并设置权限
RUN mkdir -p /usr/src/app/data && \
    chmod -R 777 /usr/src/app/data

# 暴露端口
# 端口将由 docker-compose.yml 动态管理
# EXPOSE 8888

# 设置环境变量
# 环境变量将由 docker-compose.yml 通过 env_file 动态注入
ENV NODE_ENV=production

# 启动应用
CMD ["node", "app.js"]
