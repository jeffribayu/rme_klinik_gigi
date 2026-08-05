import '../loadEnv.js';
import mysql from 'mysql2/promise';
import { treatmentCatalog } from '../constants/treatmentCatalog.js';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rme_klinik_gigi',
  });

  await conn.beginTransaction();

  for (const item of treatmentCatalog) {
    const [existing] = await conn.execute('SELECT id FROM treatments WHERE name = ? LIMIT 1', [
      item.name,
    ]);
    if (existing.length) {
      await conn.execute('UPDATE treatments SET icd9_code = ?, price = ?, is_active = 1 WHERE id = ?', [
        item.icd9_code || null,
        item.price,
        existing[0].id,
      ]);
    } else {
      await conn.execute(
        `INSERT INTO treatments (name, icd_code, icd9_code, tooth_element, price, is_active)
         VALUES (?, NULL, ?, NULL, ?, 1)`,
        [item.name, item.icd9_code || null, item.price]
      );
    }
  }

  await conn.commit();
  await conn.end();

  console.log(`Seed master tindakan selesai: ${treatmentCatalog.length} tindakan.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
