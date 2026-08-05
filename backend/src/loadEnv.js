import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/** Pastikan .env selalu dibaca dari folder backend/, walau node dijalankan dari cwd lain */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
