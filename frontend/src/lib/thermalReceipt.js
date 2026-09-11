const CLINIC = {
  tagline: 'Senyum Sehat & Percaya Diri',
  addressLines: [
    'Jl. Batang Hari (sebelah BRI), Purwosari,',
    'Kec. Pelepat Ilir, Kab. Bungo, Jambi 37252',
  ],
  phone: '+62 815-2379-5422',
  instagram: '@linsea_dentalcare',
  website: 'linseadentalcare.com',
};

let logoPromise;

function loadReceiptLogo() {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = '/assets/logo.png';
  });
  return logoPromise;
}

if (typeof window !== 'undefined') loadReceiptLogo();

function currency(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(amount).toLocaleString('id-ID')}`;
}

function receiptDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(safeDate);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('day')}-${part('month')}-${part('year')} ${part('hour')}:${part('minute')}`;
}

function priceFromText(text, label = 'tarif') {
  const match = String(text || '').match(new RegExp(`${label}\\s+Rp\\s*([\\d.,]+)`, 'i'));
  return match ? Number(match[1].replace(/[^\d]/g, '')) || 0 : 0;
}

export function receiptItemsFromRecord(treatment, notes, total) {
  const treatmentItems = String(treatment || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      name: line
        .replace(/\s*\([^)]*\),\s*frekuensi.*$/i, '')
        .replace(/,\s*frekuensi.*$/i, '')
        .trim() || 'Tindakan',
      amount: priceFromText(line),
    }));

  const medicineText = String(notes || '').split(/Pemberian Obat:/i)[1] || '';
  const medicineItems = medicineText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      name: line.replace(/,\s*jumlah.*$/i, '').trim() || 'Obat',
      amount: priceFromText(line, 'subtotal'),
    }));

  const items = [...treatmentItems, ...medicineItems].filter((item) => item.name);
  const paymentTotal = Number(total || 0);
  const itemTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!items.length || itemTotal === 0) {
    return [{ name: 'Layanan klinik', amount: paymentTotal }];
  }

  const difference = paymentTotal - itemTotal;
  if (difference !== 0) {
    items.push({
      name: difference > 0 ? 'Layanan / obat lainnya' : 'Penyesuaian pembayaran',
      amount: difference,
    });
  }
  return items;
}

export function normalizeWhatsAppPhone(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function wrappedLines(context, text, maxWidth) {
  const words = String(text || '-').split(/\s+/).filter(Boolean);
  if (!words.length) return ['-'];
  const lines = [];
  let line = words.shift();
  words.forEach((word) => {
    const candidate = `${line} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  });
  lines.push(line);
  return lines;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, align = 'left') {
  const lines = wrappedLines(context, text, maxWidth);
  context.textAlign = align;
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  context.textAlign = 'left';
  return y + lines.length * lineHeight;
}

function drawRule(context, y, width, padding) {
  context.save();
  context.strokeStyle = '#111111';
  context.lineWidth = 2;
  context.setLineDash([10, 8]);
  context.beginPath();
  context.moveTo(padding, y);
  context.lineTo(width - padding, y);
  context.stroke();
  context.restore();
}

function monochromeLogo(image) {
  if (!image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const isLogoInk = red > 80 && red > blue * 1.25 && green > 55;
    pixels.data[index] = 0;
    pixels.data[index + 1] = 0;
    pixels.data[index + 2] = 0;
    pixels.data[index + 3] = isLogoInk ? 255 : 0;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function createThermalReceipt({
  paymentId,
  createdAt,
  patientName,
  doctorName,
  items = [],
  total,
}) {
  const width = 720;
  const padding = 42;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(1800, 1320 + items.length * 125);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111111';

  const logo = monochromeLogo(await loadReceiptLogo());
  let y = 26;
  if (logo) {
    const logoWidth = 292;
    const logoHeight = Math.round(logoWidth * (logo.height / logo.width));
    context.drawImage(logo, (width - logoWidth) / 2, y, logoWidth, logoHeight);
    y += logoHeight + 2;
  } else {
    context.font = '700 54px Georgia, serif';
    context.textAlign = 'center';
    context.fillText('Linsea', width / 2, y + 58);
    context.font = '700 22px Arial, sans-serif';
    context.fillText('DENTAL CARE', width / 2, y + 92);
    context.textAlign = 'left';
    y += 118;
  }

  context.font = 'italic 20px Georgia, serif';
  y = drawWrappedText(context, CLINIC.tagline, width / 2, y, width - padding * 2, 27, 'center');
  y += 8;
  context.font = '21px Arial, sans-serif';
  for (const line of CLINIC.addressLines) {
    context.textAlign = 'center';
    context.fillText(line, width / 2, y);
    y += 28;
  }
  context.font = '22px Arial, sans-serif';
  context.fillText(`Telp. ${CLINIC.phone}`, width / 2, y);
  context.textAlign = 'left';
  y += 30;

  drawRule(context, y, width, padding);
  y += 42;
  context.font = '700 30px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('KUITANSI PEMBAYARAN', width / 2, y);
  context.textAlign = 'left';
  y += 45;

  const labelX = padding;
  const colonX = 210;
  const valueX = 235;
  const detailLineHeight = 31;
  const drawDetail = (label, value) => {
    context.font = '23px Arial, sans-serif';
    context.fillText(label, labelX, y);
    context.fillText(':', colonX, y);
    const nextY = drawWrappedText(context, value || '-', valueX, y, width - valueX - padding, detailLineHeight);
    y = Math.max(y + detailLineHeight, nextY);
  };

  drawDetail('No.', String(paymentId || '').padStart(6, '0'));
  drawDetail('Tanggal', receiptDateTime(createdAt));
  drawDetail('Nama Pasien', patientName || '-');
  drawDetail('Dokter', doctorName || '-');
  y += 2;
  drawRule(context, y, width, padding);
  y += 37;

  context.font = '700 23px Arial, sans-serif';
  context.fillText('No', padding, y);
  context.fillText('Layanan / Tindakan', padding + 65, y);
  context.textAlign = 'right';
  context.fillText('Jumlah', width - padding, y);
  context.textAlign = 'left';
  y += 20;
  drawRule(context, y, width, padding);
  y += 39;

  const safeItems = items.length ? items : [{ name: 'Layanan klinik', amount: total }];
  safeItems.forEach((item, index) => {
    context.font = '22px Arial, sans-serif';
    context.fillText(`${index + 1}.`, padding, y);
    const nameLines = wrappedLines(context, item.name || 'Layanan klinik', 405);
    nameLines.forEach((line, lineIndex) => {
      context.fillText(line, padding + 65, y + lineIndex * 30);
    });
    context.textAlign = 'right';
    context.fillText(currency(item.amount), width - padding, y);
    context.textAlign = 'left';
    y += Math.max(45, nameLines.length * 30 + 14);
  });

  drawRule(context, y, width, padding);
  y += 43;
  context.font = '700 24px Arial, sans-serif';
  context.fillText('Total Pembayaran', padding, y);
  context.textAlign = 'right';
  context.fillText(currency(total), width - padding, y);
  context.textAlign = 'left';
  y += 26;
  drawRule(context, y, width, padding);
  y += 58;

  context.font = '22px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('Terima kasih atas kepercayaan Anda', width / 2, y);
  y += 32;
  context.fillText('Semoga selalu sehat ♥', width / 2, y);
  y += 58;
  context.font = '21px Arial, sans-serif';
  context.fillText(`Instagram  ${CLINIC.instagram}`, width / 2, y);
  y += 34;
  context.fillText(`Website  ${CLINIC.website}`, width / 2, y);
  y += 64;
  context.font = 'italic 25px Georgia, serif';
  context.fillText('—  Healthy Smile, Confidently You  —', width / 2, y);
  context.textAlign = 'left';
  y += 42;

  const finalHeight = Math.ceil(y + 24);
  const output = document.createElement('canvas');
  output.width = width;
  output.height = finalHeight;
  const outputContext = output.getContext('2d');
  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, width, finalHeight);
  outputContext.drawImage(canvas, 0, 0);
  outputContext.strokeStyle = '#b8b8b8';
  outputContext.lineWidth = 2;
  outputContext.strokeRect(1, 1, width - 2, finalHeight - 2);
  return output;
}

function fileFromCanvas(canvas, filename) {
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new File([buffer], filename, { type: 'image/png' });
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareThermalReceipt(receiptData, phone) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return { mode: 'missing-phone' };

  // Buka tab saat klik masih memiliki user activation agar tidak diblokir
  // sebagai pop-up setelah proses pembuatan gambar selesai.
  let whatsappWindow = null;
  try {
    whatsappWindow = window.open('', '_blank');
    if (whatsappWindow) {
      whatsappWindow.opener = null;
      whatsappWindow.document.title = 'Menyiapkan struk WhatsApp';
      whatsappWindow.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:24px">Menyiapkan gambar struk...</p>';
    }
  } catch {
    whatsappWindow = null;
  }

  let file;
  try {
    const canvas = await createThermalReceipt(receiptData);
    const filename = `kuitansi-${String(receiptData.paymentId || '').padStart(6, '0')}.png`;
    file = fileFromCanvas(canvas, filename);
  } catch (error) {
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
    throw error;
  }

  let copied = false;
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': file })]);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) downloadFile(file);
  const whatsappUrl = `https://wa.me/${normalizedPhone}`;
  if (whatsappWindow && !whatsappWindow.closed) {
    whatsappWindow.location.replace(whatsappUrl);
  }
  return {
    mode: copied ? 'clipboard' : 'downloaded',
    popupBlocked: !whatsappWindow,
  };
}
