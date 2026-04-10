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

  return {
    rejectUnauthorized: false,
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
      queueLimit: 0,
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const mysqlPool = getMysqlPool();
  const [rows] = await mysqlPool.execute(sql, params);
  return rows;
}

export async function pingDatabase() {
  const rows = await query('SELECT DATABASE() AS database_name, NOW() AS server_time');
  return rows[0];
}
