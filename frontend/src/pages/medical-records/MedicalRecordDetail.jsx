import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Trash2, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatDateISO, publicAssetUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const medicineMarker = 'Pemberian Obat:';

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

function splitMedicineNotes(notes) {
  const text = String(notes || '');
  const index = text.indexOf(medicineMarker);
  if (index < 0) return { examNotes: text, medicines: [] };
  return {
    examNotes: text.slice(0, index).trim(),
    medicines: text
      .slice(index + medicineMarker.length)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

function noteValue(notes, label) {
  const line = String(notes || '')
    .split('\n')
    .find((item) => item.startsWith(`${label}:`));
  const value = line ? line.slice(label.length + 1).trim() : '';
  return value && value !== '-' ? value : '-';
}

function treatmentRows(treatment) {
  return String(treatment || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(.*?)\s*\((.*?)\),\s*frekuensi\s*(.*?)(?:,\s*(?:petugas|asisten|perawat)\s*([^,]+))?,\s*tarif\s*(.*)$/i
      );
      const rawPrice = match?.[5] || '';
      const price = Number(String(rawPrice).replace(/[^\d]/g, '')) || 0;
      return {
        description: line,
        name: match?.[1]?.trim() || line,
        tooth: match?.[2]?.trim() || '-',
        frequency: match?.[3]?.trim() || '-',
        staff: match?.[4]?.trim() || '-',
        price,
      };
    });
}

function statusLabel(value) {
  return String(value || '-')
    .replace('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeWaPhone(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

function invoiceWhatsAppUrl(mr, payment) {
  const phone = normalizeWaPhone(mr.patient_phone);
  if (!phone) return '';
  const invoiceNo = `INV-${String(payment.id).padStart(5, '0')}`;
  const text = [
    `Halo ${mr.patient_name || 'Bapak/Ibu'},`,
    '',
    'Pembayaran layanan Linsea Dental Care sudah tercatat lunas.',
    `No. Invoice: ${invoiceNo}`,
    `No. Rekam Medis: ${mr.patient_code || '-'}`,
    `Tanggal kunjungan: ${formatDateISO(mr.visit_date)}`,
    `Total: ${formatCurrency(payment.total_price)}`,
    `Metode: ${String(payment.payment_method || '-').toUpperCase()}`,
    '',
    'Terima kasih.'
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function MedicalRecordDetail() {
  const { id } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'admin' || role === 'doctor';
  const [mr, setMr] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/api/v1/medical-records/${id}`);
      setMr(data.data);
    } catch {
      toast.error('Gagal memuat rekam medis');
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updatePaymentStatus = async (payment, status) => {
    try {
      const { data } = await api.put(`/api/v1/payments/${payment.id}`, {
        total_price: Number(payment.total_price),
        payment_method: payment.payment_method,
        payment_status: status,
      });
      toast.success('Status pembayaran diperbarui');
      if (status === 'lunas') {
        const waUrl = invoiceWhatsAppUrl(mr, data.data || payment);
        if (waUrl) {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
          toast.success('Invoice WhatsApp dibuka. Tekan kirim di WhatsApp.');
        } else {
          toast.info('Status lunas. Nomor WhatsApp pasien belum tersedia.');
        }
      }
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengubah status pembayaran');
    }
  };

  const deleteTreatmentAction = async (indexToDelete) => {
    if (!window.confirm('Hapus tindakan ini dari riwayat tindakan?')) return;
    const nextTreatment = actions
      .filter((_, index) => index !== indexToDelete)
      .map((row) => row.description)
      .join('\n');
    try {
      await api.put(`/api/v1/medical-records/${mr.id}`, {
        patient_id: Number(mr.patient_id),
        doctor_id: Number(mr.doctor_id),
        complaint: mr.complaint || null,
        diagnosis: mr.diagnosis || null,
        treatment: nextTreatment || null,
        notes: mr.notes || null,
        visit_date: formatDateISO(mr.visit_date),
        prescriptions: prescriptions.map((rx) => ({
          medicine_name: rx.medicine_name,
          dosage: rx.dosage || null,
          instruction: rx.instruction || null,
        })),
      });
      toast.success('Tindakan dihapus');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus tindakan');
    }
  };

  if (!mr) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const { examNotes, medicines } = splitMedicineNotes(mr.notes);
  const prescriptions = mr.prescriptions || [];
  const payments = mr.payments || [];
  const actions = treatmentRows(mr.treatment);
  const actionSubtotal = actions.reduce((sum, row) => sum + row.price, 0);

  const printInvoice = async (payment) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const teal = [18, 148, 136];
    const dark = [31, 41, 55];
    const muted = [107, 114, 128];
    const invoiceNo = `INV-${String(payment.id).padStart(5, '0')}`;
    const issuedAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const logoDataUrl = await loadImageDataUrl('/assets/logo.png');
    const rows = [
      ...actions.map((row) => [
        `${row.name} (${row.tooth}), frekuensi ${row.frequency}`,
        formatDateISO(mr.visit_date),
        'Tindakan',
        formatCurrency(row.price),
      ]),
      ...medicines.map((line) => [
        line,
        formatDateISO(mr.visit_date),
        'Obat',
        '',
      ]),
    ];
    if (!rows.length) {
      rows.push(['Tagihan layanan klinik', formatDateISO(mr.visit_date), 'Layanan', formatCurrency(payment.total_price)]);
    }

    doc.setFillColor(...teal);
    doc.rect(0, 0, pageWidth, 92, 'F');
    if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', margin, 26, 38, 38);
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
    doc.text(mr.patient_name || '-', margin + 18, 158);
    doc.setTextColor(...muted);
    doc.text(`No. Rekam Medis: ${mr.patient_code || '-'}`, margin + 18, 174);

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pembayaran', pageWidth / 2 + 16, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal invoice: ${issuedAt}`, pageWidth / 2 + 16, 158);
    doc.text(`Tanggal kunjungan: ${formatDateISO(mr.visit_date)}`, pageWidth / 2 + 16, 174);
    doc.text(`Metode: ${statusLabel(payment.payment_method)}`, pageWidth / 2 + 16, 190);

    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Rincian Tagihan', margin, 236);
    autoTable(doc, {
      startY: 252,
      head: [['Deskripsi', 'Tanggal', 'Kategori', 'Nilai']],
      body: rows,
      foot: [['', '', 'Total', formatCurrency(payment.total_price)]],
      theme: 'grid',
      headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [243, 244, 246], textColor: dark, fontStyle: 'bold' },
      styles: { fontSize: 9.5, cellPadding: 10, lineColor: [229, 231, 235], textColor: dark },
      columnStyles: { 0: { cellWidth: 240 }, 3: { halign: 'right' } },
    });

    const finalY = doc.lastAutoTable.finalY + 34;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, finalY, pageWidth - margin * 2, 74, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text('Catatan', margin + 16, finalY + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...muted);
    doc.text('Invoice ini dibuat otomatis oleh sistem Linsea Dental Care sebagai bukti pencatatan pembayaran.', margin + 16, finalY + 44);
    doc.text('Terima kasih atas kepercayaan Anda.', margin + 16, finalY + 60);

    doc.setProperties({ title: `invoice-${payment.id}.pdf` });
    const blobUrl = doc.output('bloburl');
    const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!opened) toast.error('Preview PDF diblokir browser. Izinkan pop-up untuk melihat invoice.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">Rekam medis</h1>
            <Badge variant="secondary">{formatDate(mr.visit_date)}</Badge>
          </div>
          <p className="text-muted-foreground">
            {mr.patient_name} - {mr.patient_code}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" asChild>
            <Link to={`/medical-records/${mr.id}/edit`}>Edit rekam medis</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <section className="rounded border border-teal-300 bg-teal-50/20 p-5">
            <h2 className="mb-5 text-xl font-semibold">Data Anamnesa dan Pemeriksaan Tersimpan</h2>
            <div className="grid gap-x-12 gap-y-3 text-sm lg:grid-cols-2">
              <div className="space-y-3">
                <SummaryLine label="Pemeriksaan" value={mr.complaint || noteValue(examNotes, 'Pemeriksaan')} />
                <SummaryLine label="Kesadaran" value={noteValue(examNotes, 'Tingkat Kesadaran')} />
                <SummaryLine label="Diagnosis Primer" value={mr.diagnosis} />
                <SummaryLine label="Diagnosis Sekunder" value={noteValue(examNotes, 'Diagnosis Sekunder')} />
                <SummaryLine label="Prognosis" value={noteValue(examNotes, 'Prognosis')} />
                <SummaryLine label="Tindakan" value={mr.treatment} />
                <SummaryLine label="Rencana Rawat" value={noteValue(examNotes, 'Rencana Rawat Pasien')} />
              </div>
              <div className="space-y-3">
                <SummaryLine label="Denyut Jantung" value={noteValue(examNotes, 'Denyut Jantung')} />
                <SummaryLine label="Pernapasan" value={noteValue(examNotes, 'Pernapasan')} />
                <SummaryLine label="Tekanan Darah" value={noteValue(examNotes, 'Tekanan Darah')} />
                <SummaryLine label="Suhu Tubuh" value={noteValue(examNotes, 'Suhu Tubuh')} />
                <SummaryLine label="Tinggi/Berat" value={noteValue(examNotes, 'Tinggi/Berat Badan')} />
                <SummaryLine label="Dokumentasi" value={noteValue(examNotes, 'Dokumentasi')} />
              </div>
            </div>
          </section>

          <div className="flex justify-between gap-4 border-b border-border/40 pb-4 text-sm">
            <span className="text-muted-foreground">Dokter</span>
            <div className="flex max-w-[70%] items-center gap-2 text-right font-medium">
              {mr.doctor_photo ? (
                <img
                  src={publicAssetUrl(mr.doctor_photo)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : null}
              <span>{mr.doctor_name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tindakan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border px-3 py-2 text-left">No.</th>
                    <th className="border px-3 py-2 text-left">Tindakan</th>
                    <th className="border px-3 py-2 text-left">Elemen Gigi</th>
                    <th className="border px-3 py-2 text-left">Frekuensi</th>
                    <th className="border px-3 py-2 text-right">Tarif</th>
                    {canEdit && <th className="border px-3 py-2 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((row, index) => (
                    <tr key={`${row.description}-${index}`}>
                      <td className="border px-3 py-2">{index + 1}</td>
                      <td className="border px-3 py-2">{row.name}</td>
                      <td className="border px-3 py-2">{row.tooth}</td>
                      <td className="border px-3 py-2">{row.frequency}</td>
                      <td className="border px-3 py-2 text-right">{formatCurrency(row.price)}</td>
                      {canEdit && (
                        <td className="border px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteTreatmentAction(index)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="border px-3 py-2 text-right" colSpan={canEdit ? 4 : 4}>
                      Subtotal Tarif
                    </td>
                    <td className="border px-3 py-2 text-right">{formatCurrency(actionSubtotal)}</td>
                    {canEdit && <td className="border px-3 py-2" />}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {prescriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resep</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prescriptions.map((rx) => (
                <li key={rx.id} className="rounded border border-border/50 px-4 py-3 text-sm">
                  <p className="font-semibold">{rx.medicine_name}</p>
                  <p className="text-muted-foreground">{rx.dosage || '-'}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs">{rx.instruction || '-'}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {medicines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Obat</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {medicines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((py) => (
              <div
                key={py.id}
                className="flex flex-wrap items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{formatCurrency(py.total_price)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{py.payment_method}</p>
                </div>
                <Badge
                  variant={
                    py.payment_status === 'lunas'
                      ? 'success'
                      : py.payment_status === 'sebagian'
                        ? 'warning'
                        : 'destructive'
                  }
                >
                  {py.payment_status.replace('_', ' ')}
                </Badge>
                <select
                  value={py.payment_status}
                  onChange={(e) => updatePaymentStatus(py, e.target.value)}
                  className="h-9 rounded border border-input bg-background px-3 text-sm capitalize"
                >
                  <option value="belum_bayar">Belum bayar</option>
                  <option value="sebagian">Sebagian</option>
                  <option value="lunas">Lunas</option>
                </select>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => printInvoice(py)}>
                  <FileText className="h-4 w-4" />
                  Invoice PDF
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="grid grid-cols-[190px_16px_1fr] items-start gap-2">
      <span className="font-semibold">{label}</span>
      <span>:</span>
      <span className="whitespace-pre-wrap">{value || '-'}</span>
    </div>
  );
}
