const path = require('path');
const fs = require('fs');

//
// 后端存储适配：优先使用 Postgres（DATABASE_URL），否则使用 SQLite 本地文件。
// 在 Vercel/Serverless 环境下，SQLite 位于 /tmp，仅用于演示，数据非持久。
//

const usePg = !!(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());

// 将 SQLite 风格的 `?` 占位符转换为 PG 风格的 $1,$2...
function toPgSql(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

if (usePg) {
  // Postgres 分支（推荐用于 Vercel 持久化）
  let Pool;
  try {
    ({ Pool } = require('pg'));
  } catch (e) {
    console.error('[DB] 缺少 pg 依赖。请运行: npm install pg');
    throw e;
  }

  // Neon/Supabase 等免费层通常需要 SSL，但无需校验证书
  const sslEnabled = process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false };
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled
  });

  async function initDatabase() {
    const sql = `
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        html_content TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        password TEXT,
        is_protected INTEGER DEFAULT 0,
        code_type TEXT DEFAULT 'html'
      )`;
    await pool.query(sql);
    console.log('数据库初始化成功（Postgres）');
  }

  async function query(sql, params = []) {
    const res = await pool.query(toPgSql(sql), params);
    return res.rows;
  }

  async function get(sql, params = []) {
    const res = await pool.query(toPgSql(sql), params);
    return res.rows[0] || null;
  }

  async function run(sql, params = []) {
    const res = await pool.query(toPgSql(sql), params);
    return { rowCount: res.rowCount };
  }

  module.exports = {
    db: null,
    initDatabase,
    query,
    get,
    run
  };
} else {
  // SQLite 分支（本地/Docker 默认）
  const sqlite3 = require('sqlite3').verbose();

  function chooseDbPath() {
    const envDbPath = process.env.DB_PATH && String(process.env.DB_PATH).trim();
    if (envDbPath) {
      return path.isAbsolute(envDbPath) ? envDbPath : path.join(process.cwd(), envDbPath);
    }

    const tmpPath = '/tmp';
    let canUseTmp = false;
    try {
      fs.accessSync(tmpPath, fs.constants.W_OK);
      canUseTmp = true;
    } catch (e) {
      canUseTmp = false;
    }

    if (process.env.NODE_ENV === 'production' && canUseTmp) {
      return path.join(tmpPath, 'html-go.db');
    }

    return path.join(__dirname, '../db/html-go.db');
  }

  const dbPath = chooseDbPath();

  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (e) {
    console.warn('[DB] 无法创建数据库目录:', e.message);
  }

  const db = new sqlite3.Database(dbPath);

  function initDatabase() {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
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
          if (err) return reject(err);
          console.log('数据库初始化成功（SQLite）');
          resolve();
        });
      });
    });
  }

  function query(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
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
}
