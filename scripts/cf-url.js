#!/usr/bin/env node
const { exec } = require('child_process');

const cmd = 'docker logs quickshare-cloudflared --since 24h 2>&1';

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error('读取 cloudflared 日志失败：', err.message);
    process.exit(1);
  }
  const text = stdout || '';
  const regex = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;
  const matches = text.match(regex) || [];
  if (!matches.length) {
    console.error('未在日志中发现 trycloudflare 公网地址。容器可能尚未就绪。');
    console.error('提示：先运行 `docker compose up -d`，等待 5-10 秒再重试。');
    process.exit(2);
  }
  console.log(matches[matches.length - 1]);
});

