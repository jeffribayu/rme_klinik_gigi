import './loadEnv.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import v1 from './routes/v1.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureAppSchema } from './config/ensureSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.warn(
    '[WARN] Set JWT_SECRET di .env (minimal 16 karakter) untuk keamanan production.'
  );
}

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'rme-klinik-gigi-api' });
});

app.use('/api/v1', v1);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await ensureAppSchema();
  } catch (e) {
    console.error('[DB] Gagal memastikan skema basis data:', e.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`RME API listening on http://localhost:${PORT}`);
  });
}

start();
