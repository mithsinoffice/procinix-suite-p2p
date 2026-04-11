import fs from 'node:fs';
import mysql from 'mysql2/promise';

let pool;

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildSslConfig() {
  const sslMode = (process.env.MYSQL_SSL_MODE ?? 'required').toLowerCase();
  if (sslMode === 'disabled' || sslMode === 'false' || sslMode === 'off') {
    return undefined;
  }

  const caPath = process.env.MYSQL_SSL_CA;
  if (caPath) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(caPath),
    };
  }

  return {
    rejectUnauthorized: true,
  };
}

export function getMysqlPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: requireEnv('MYSQL_HOST'),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      database: requireEnv('MYSQL_DATABASE'),
      user: requireEnv('MYSQL_USER'),
      password: requireEnv('MYSQL_PASSWORD'),
      ssl: buildSslConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 50,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
    });
  }

  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function getConnection() {
  const mysqlPool = getMysqlPool();
  return mysqlPool.getConnection();
}

export async function withTransaction(fn) {
  const conn = await getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function query(sql, params = []) {
  const mysqlPool = getMysqlPool();
  const [rows] = await mysqlPool.execute(sql, params);
  return rows;
}

export async function connExecute(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

export async function pingDatabase() {
  const rows = await query('SELECT DATABASE() AS database_name, NOW() AS server_time');
  return rows[0];
}
