/**
 * 数据库迁移脚本：将旧的 /tmp/html-go.db 迁移到持久化卷路径
 * 使用方法（容器内执行）：
 *   docker compose exec html-go-express node scripts/migrate-db-to-volume.js
 * 可选参数：
 *   --src=<源路径>       默认 /tmp/html-go.db
 *   --dest=<目标路径>    默认读取环境变量 DB_PATH；若无则 /usr/src/app/data/html-go.db
 *   --force              目标已存在时覆盖（默认不覆盖）
 *   --no-backup          覆盖时不创建 .bak 备份（默认创建备份）
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach((a) => {
    if (a.startsWith('--src=')) args.src = a.slice(6);
    else if (a.startsWith('--dest=')) args.dest = a.slice(7);
    else if (a === '--force') args.force = true;
    else if (a === '--no-backup') args.noBackup = true;
  });
  return args;
}

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatTs(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function main() {
  const argv = parseArgs(process.argv);
  const defaultSrc = '/tmp/html-go.db';
  const defaultDest = process.env.DB_PATH && String(process.env.DB_PATH).trim()
    ? process.env.DB_PATH
    : '/usr/src/app/data/html-go.db';

  const src = argv.src || defaultSrc;
  const dest = argv.dest || defaultDest;
  const force = !!argv.force;
  const noBackup = !!argv.noBackup;

  console.log('[DB MIGRATE] 源路径(src):', src);
  console.log('[DB MIGRATE] 目标路径(dest):', dest);

  if (!fs.existsSync(src)) {
    console.error('[DB MIGRATE] 源文件不存在：', src);
    console.error('提示：若你之前未在 /tmp 使用过数据库，可忽略本迁移。');
    process.exit(1);
  }

  const destExists = fs.existsSync(dest);
  if (destExists && !force) {
    console.error('[DB MIGRATE] 目标已存在，默认不覆盖。');
    console.error('可使用 --force 覆盖，或指定 --dest=... 另存。');
    process.exit(2);
  }

  try {
    ensureDir(dest);

    if (destExists && force && !noBackup) {
      const backupPath = dest + '.bak-' + formatTs();
      fs.copyFileSync(dest, backupPath);
      console.log('[DB MIGRATE] 已创建备份：', backupPath);
    }

    fs.copyFileSync(src, dest);
    console.log('[DB MIGRATE] 迁移完成。');
    console.log('[DB MIGRATE] 请重启应用以使用新位置的数据库（若仍在运行旧进程）。');
  } catch (e) {
    console.error('[DB MIGRATE] 迁移失败：', e.message);
    process.exit(3);
  }
}

main();

