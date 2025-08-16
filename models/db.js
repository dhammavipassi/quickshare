const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 选择可写的数据目录（优先 /tmp，用于 Vercel/Serverless）
function chooseDbPath() {
  const tmpPath = '/tmp';
  let canUseTmp = false;
  try {
    fs.accessSync(tmpPath, fs.constants.W_OK);
    canUseTmp = true;
  } catch (e) {
    canUseTmp = false;
  }

  // 在生产且 /tmp 可写时，使用 /tmp（Vercel 函数环境）
  if (process.env.NODE_ENV === 'production' && canUseTmp) {
    return path.join(tmpPath, 'html-go.db');
  }

  // 本地/其他环境：使用项目内 db 目录
  return path.join(__dirname, '../db/html-go.db');
}

const dbPath = chooseDbPath();

// 确保数据库目录存在（若在只读目录失败则忽略，但优先避免选择只读路径）
try {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (e) {
  console.warn('[DB] 无法创建数据库目录:', e.message);
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath);

// 初始化数据库
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建页面表
      db.run(`
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          html_content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          password TEXT,
          is_protected INTEGER DEFAULT 0,
          code_type TEXT DEFAULT 'html'
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('数据库初始化成功');
          resolve();
        }
      });
    });
  });
}

// 执行查询的辅助函数
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 执行单行查询的辅助函数
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// 执行更新的辅助函数
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

module.exports = {
  db,
  initDatabase,
  query,
  get,
  run
};
