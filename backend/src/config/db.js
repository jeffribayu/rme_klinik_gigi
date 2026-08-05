import mysql from 'mysql2/promise';
import '../loadEnv.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'rme_klinik_gigi',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** INSERT/UPDATE/DELETE — returns ResultSetHeader */
export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export function getPool() {
  return pool;
}
