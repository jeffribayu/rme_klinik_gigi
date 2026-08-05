const DESCRIPTOR_SIZE = 18;

function getFaceBox(width, height) {
  const size = Math.floor(Math.min(width, height) * 0.72);
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
    size,
  };
}

function ensureVideoFrame(video) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('Gambar kamera belum siap');
  }
}

export function descriptorFromVideo(video) {
  ensureVideoFrame(video);

  const source = document.createElement('canvas');
  source.width = video.videoWidth;
  source.height = video.videoHeight;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(video, 0, 0, source.width, source.height);

  const box = getFaceBox(source.width, source.height);
  const small = document.createElement('canvas');
  small.width = DESCRIPTOR_SIZE;
  small.height = DESCRIPTOR_SIZE;
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  smallCtx.drawImage(
    source,
    box.x,
    box.y,
    box.size,
    box.size,
    0,
    0,
    DESCRIPTOR_SIZE,
    DESCRIPTOR_SIZE
  );

  const data = smallCtx.getImageData(0, 0, DESCRIPTOR_SIZE, DESCRIPTOR_SIZE).data;
  const gray = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255);
  }

  const mean = gray.reduce((sum, n) => sum + n, 0) / gray.length;
  const variance = gray.reduce((sum, n) => sum + (n - mean) ** 2, 0) / gray.length;
  const contrast = Math.sqrt(variance);
  const denom = contrast || 1;
  const vector = gray.map((n) => (n - mean) / denom);
  const norm = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0)) || 1;
  const descriptor = vector.map((n) => Number((n / norm).toFixed(6)));

  return {
    descriptor,
    quality: {
      brightness: Number(mean.toFixed(3)),
      contrast: Number(contrast.toFixed(3)),
      ok: mean > 0.18 && mean < 0.86 && contrast > 0.045,
    },
  };
}

export function averageDescriptors(descriptors) {
  const valid = descriptors.filter((d) => Array.isArray(d) && d.length);
  if (!valid.length) return [];
  const len = valid[0].length;
  const vector = Array.from({ length: len }, (_, i) =>
    valid.reduce((sum, d) => sum + Number(d[i] || 0), 0) / valid.length
  );
  const norm = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0)) || 1;
  return vector.map((n) => Number((n / norm).toFixed(6)));
}

export function cosineSimilarity(a, b) {
  const len = Math.min(a?.length || 0, b?.length || 0);
  if (!len) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function blobFromVideo(video, quality = 0.9) {
  ensureVideoFrame(video);
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Gagal mengambil foto bukti'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
