import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, formatDateISO, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

function loadImageDataUrl(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve('');
    image.src = src;
  });
}

function invoiceTreatmentRows(row, statusLabel) {
  const lines = String(row.treatment || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const descriptions = lines.length ? lines : ['Layanan pemeriksaan dan tindakan'];
  return descriptions.map((description) => [
    description,
    formatDateISO(row.visit_date),
    statusLabel(row.payment_method),
    '',
  ]);
}

function normalizeWaPhone(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function invoiceWhatsAppUrl(row) {
  const phone = normalizeWaPhone(row.patient_phone);
  if (!phone) return '';
  const invoiceNo = `INV-${String(row.id).padStart(5, '0')}`;
  const text = [
    `Halo ${row.patient_name || 'Bapak/Ibu'},`,
    '',
    'Pembayaran layanan Linsea Dental Care sudah tercatat lunas.',
    `No. Invoice: ${invoiceNo}`,
    `No. Rekam Medis: ${row.patient_code || '-'}`,
    `Tanggal kunjungan: ${formatDateISO(row.visit_date)}`,
    `Total: ${formatCurrency(row.total_price)}`,
    `Metode: ${String(row.payment_method || '-').toUpperCase()}`,
    '',
    'Terima kasih.'
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function Payments() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'doctor' || role === 'nurse';

  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mrList, setMrList] = useState([]);
  const [form, setForm] = useState({
    medical_record_id: '',
    total_price: '',
    payment_method: 'tunai',
    payment_status: 'belum_bayar',
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/payments');
      setList(data.data);
    } catch {
      toast.error('Gagal memuat pembayaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (params.get('new') === '1' && params.get('mr')) {
      setForm((f) => ({
        ...f,
        medical_record_id: params.get('mr'),
      }));
      setDialogOpen(true);
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (!dialogOpen) return;
    (async () => {
      try {
        const { data } = await api.get('/api/v1/medical-records');
        setMrList(data.data || []);
      } catch {
        toast.error('Gagal memuat daftar rekam medis');
      }
    })();
  }, [dialogOpen]);

  const submit = async () => {
    try {
      const { data } = await api.post('/api/v1/payments', {
        medical_record_id: Number(form.medical_record_id),
        total_price: Number(form.total_price),
        payment_method: form.payment_method,
        payment_status: form.payment_status,
      });
      toast.success('Pembayaran dicatat');
      const row = data.data;
      if (row?.payment_status === 'lunas') {
        const waUrl = invoiceWhatsAppUrl(row);
        if (waUrl) {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
          toast.success('Invoice WhatsApp dibuka. Tekan kirim di WhatsApp.');
        } else {
          toast.info('Pembayaran lunas. Nomor WhatsApp pasien belum tersedia.');
        }
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const statusLabel = (value) =>
    String(value || '-')
      .replace('_', ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const openPdfPreview = (doc, filename) => {
    doc.setProperties({ title: filename });
    const blobUrl = doc.output('bloburl');
    const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      toast.error('Preview PDF diblokir browser. Izinkan pop-up untuk melihat invoice.');
    }
  };

  const printInvoice = async (row) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const teal = [18, 148, 136];
    const dark = [31, 41, 55];
    const muted = [107, 114, 128];
    const invoiceNo = `INV-${String(row.id).padStart(5, '0')}`;
    const issuedAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const logoDataUrl = await loadImageDataUrl('/assets/logo.png');
    const detailRows = invoiceTreatmentRows(row, statusLabel);
    detailRows[detailRows.length - 1][3] = formatCurrency(row.total_price);

    doc.setFillColor(...teal);
    doc.rect(0, 0, pageWidth, 92, 'F');
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, 26, 38, 38);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Linsea Dental Care', logoDataUrl ? margin + 56 : margin, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Invoice Pembayaran Layanan Klinik Gigi', logoDataUrl ? margin + 56 : margin, 62);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('INVOICE', pageWidth - margin, 40, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoiceNo, pageWidth - margin, 60, { align: 'right' });

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(margin, 116, pageWidth - margin * 2, 88, 8, 8, 'F');
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Ditagihkan kepada', margin + 18, 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(row.patient_name || '-', margin + 18, 158);
    doc.setTextColor(...muted);
    doc.text(`No. Rekam Medis: ${row.patient_code || '-'}`, margin + 18, 174);

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pembayaran', pageWidth / 2 + 16, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal invoice: ${issuedAt}`, pageWidth / 2 + 16, 158);
    doc.text(`Tanggal kunjungan: ${formatDateISO(row.visit_date)}`, pageWidth / 2 + 16, 174);
    doc.text(`Metode: ${statusLabel(row.payment_method)}`, pageWidth / 2 + 16, 190);

    const statusColor =
      row.payment_status === 'lunas'
        ? [16, 185, 129]
        : row.payment_status === 'sebagian'
          ? [245, 158, 11]
          : [239, 68, 68];
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - margin - 112, 214, 112, 28, 6, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(statusLabel(row.payment_status), pageWidth - margin - 56, 232, {
      align: 'center',
    });

    doc.setTextColor(...dark);
    doc.setFontSize(13);
    doc.text('Rincian Tagihan', margin, 236);
    autoTable(doc, {
      startY: 252,
      head: [['Deskripsi', 'Tanggal', 'Metode', 'Nilai']],
      body: detailRows,
      foot: [['', '', 'Total', formatCurrency(row.total_price)]],
      theme: 'grid',
      headStyles: {
        fillColor: teal,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: dark,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9.5,
        cellPadding: 10,
        lineColor: [229, 231, 235],
        textColor: dark,
      },
      columnStyles: {
        0: { cellWidth: 220 },
        3: { halign: 'right' },
      },
    });

    const finalY = doc.lastAutoTable.finalY + 34;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, 74, 8, 8, 'F');
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Catatan', margin + 16, finalY + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...muted);
    doc.text(
      'Invoice ini dibuat otomatis oleh sistem Linsea Dental Care sebagai bukti pencatatan pembayaran.',
      margin + 16,
      finalY + 44
    );
    doc.text('Terima kasih atas kepercayaan Anda.', margin + 16, finalY + 60);

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, 770, pageWidth - margin, 770);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('Linsea Dental Care', margin, 790);
    doc.text(`Dicetak: ${issuedAt}`, pageWidth - margin, 790, { align: 'right' });

    openPdfPreview(doc, `invoice-${row.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pembayaran</h1>
          <p className="text-muted-foreground">Tagihan dan status pembayaran.</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setForm({
                medical_record_id: '',
                total_price: '',
                payment_method: 'tunai',
                payment_status: 'belum_bayar',
              });
              setDialogOpen(true);
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Catat pembayaran
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Pasien</th>
                    <th className="px-6 py-3 font-medium">Jumlah</th>
                    <th className="px-6 py-3 font-medium">Metode</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Waktu</th>
                    <th className="px-6 py-3 text-right font-medium">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="px-6 py-3">
                        <div className="font-medium">{row.patient_name}</div>
                        <div className="text-xs text-muted-foreground">{row.patient_code}</div>
                      </td>
                      <td className="px-6 py-3">{formatCurrency(row.total_price)}</td>
                      <td className="px-6 py-3 capitalize">{row.payment_method}</td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            row.payment_status === 'lunas'
                              ? 'success'
                              : row.payment_status === 'sebagian'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {row.payment_status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => printInvoice(row)}>
                          Preview PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <p className="px-6 py-12 text-center text-muted-foreground">
                  Belum ada pembayaran.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Kunjungan (ID rekam medis)</Label>
              <Select
                value={
                  form.medical_record_id ? String(form.medical_record_id) : undefined
                }
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, medical_record_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pasien dan tanggal kunjungan…" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(320px,70vh)]">
                  {mrList.map((mr) => (
                    <SelectItem key={mr.id} value={String(mr.id)}>
                      ID {mr.id} — {mr.patient_name} ({mr.patient_code}) —{' '}
                      {formatDate(mr.visit_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Bukan kode pasien</span> seperti 0004.
                Pilih baris di atas (ID per kunjungan), atau dari halaman detail rekam medis tombol
                &quot;Catat pembayaran&quot; agar ID terisi otomatis. Angka ID sama dengan bagian
                terakhir URL{' '}
                <code className="rounded bg-muted px-1">/medical-records/5</code> → ID 5.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Total (Rp)</Label>
              <Input
                type="number"
                value={form.total_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, total_price: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Metode</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="kartu">Kartu</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.payment_status}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum_bayar">Belum bayar</SelectItem>
                  <SelectItem value="sebagian">Sebagian</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Tutup
            </Button>
            <Button onClick={submit} disabled={!form.medical_record_id || !form.total_price}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
