import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ageFromBirthDate, formatCurrency } from '@/lib/utils';

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

function generatedAt() {
  return new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function previewPdf(doc, filename) {
  doc.setProperties({ title: filename });
  const opened = window.open(doc.output('bloburl'), '_blank', 'noopener,noreferrer');
  if (!opened) {
    toast.error('Preview PDF diblokir browser. Izinkan pop-up untuk melihat laporan.');
  }
}

async function createReportDoc(title, orientation = 'portrait') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const teal = [18, 148, 136];
  const dark = [31, 41, 55];
  const logo = await loadImageDataUrl('/assets/logo.png');

  doc.setFillColor(...teal);
  doc.rect(0, 0, pageWidth, 92, 'F');
  if (logo) doc.addImage(logo, 'PNG', margin, 25, 40, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Linsea Dental Care', logo ? margin + 54 : margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('RME Linsea Klinik Gigi', logo ? margin + 54 : margin, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, pageWidth - margin, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(generatedAt(), pageWidth - margin, 58, { align: 'right' });

  return { doc, margin, teal, dark, pageWidth };
}

function tableOptions({ margin, teal, dark }) {
  return {
    theme: 'grid',
    headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 8, textColor: dark, lineColor: [229, 231, 235] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
  };
}

function clip(value, length = 90) {
  const text = String(value || '-').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function paymentServiceSummary(row) {
  const service = [row.diagnosis, row.treatment].filter(Boolean).join(' - ');
  return clip(service, 58);
}

function formatAge(birthDate) {
  const age = ageFromBirthDate(birthDate);
  return age == null ? '-' : `${age} th`;
}

export default function Reports() {
  const [busy, setBusy] = useState(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const reportParams = () => (month ? { month } : {});

  const exportPatientsPdf = async () => {
    setBusy('p-pdf');
    try {
      const { data } = await api.get('/api/v1/reports/patients', { params: reportParams() });
      const rows = data.data;
      const report = await createReportDoc('Laporan Pasien');
      autoTable(report.doc, {
        startY: 122,
        head: [['Kode', 'Nama', 'JK', 'Tgl lahir', 'Usia', 'Telepon', 'Alamat']],
        body: rows.map((r) => [
          r.patient_code,
          r.name,
          r.gender,
          r.birth_date?.slice(0, 10),
          formatAge(r.birth_date),
          r.phone || '-',
          clip(r.address, 70),
        ]),
        ...tableOptions(report),
        styles: { ...tableOptions(report).styles, fontSize: 6.7, cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 76 },
          1: { cellWidth: 96 },
          2: { cellWidth: 28 },
          3: { cellWidth: 62 },
          4: { cellWidth: 38 },
          5: { cellWidth: 70 },
          6: { cellWidth: 150 },
        },
      });
      previewPdf(report.doc, 'laporan-pasien.pdf');
    } catch {
      toast.error('Gagal ekspor PDF');
    } finally {
      setBusy(null);
    }
  };

  const exportPatientsExcel = async () => {
    setBusy('p-xlsx');
    try {
      const { data } = await api.get('/api/v1/reports/patients', { params: reportParams() });
      const rows = (data.data || []).map((r) => ({
        Kode: r.patient_code,
        NIK: r.nik || '',
        Nama: r.name,
        JK: r.gender,
        'Tanggal Lahir': r.birth_date?.slice(0, 10) || '',
        Usia: ageFromBirthDate(r.birth_date) ?? '',
        Telepon: r.phone || '',
        Alamat: r.address || '',
        'Tanggal Input': r.created_at?.slice(0, 10) || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pasien');
      XLSX.writeFile(wb, 'laporan-pasien.xlsx');
      toast.success('Excel pasien diunduh');
    } catch {
      toast.error('Gagal ekspor Excel');
    } finally {
      setBusy(null);
    }
  };

  const exportPaymentsPdf = async () => {
    setBusy('pay-pdf');
    try {
      const { data } = await api.get('/api/v1/reports/payments', { params: reportParams() });
      const rows = data.data;
      const report = await createReportDoc('Laporan Pembayaran');
      const totalAmount = rows.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
      autoTable(report.doc, {
        startY: 122,
        head: [['Invoice', 'Pasien', 'No. RM', 'Kunjungan', 'Layanan', 'Status', 'Total']],
        body: rows.map((r) => [
          `INV-${String(r.id).padStart(5, '0')}`,
          r.patient_name,
          r.patient_code,
          r.visit_date?.slice(0, 10),
          paymentServiceSummary(r),
          r.payment_status,
          formatCurrency(r.total_price),
        ]),
        foot: [['', '', '', '', '', 'Jumlah Total', formatCurrency(totalAmount)]],
        ...tableOptions(report),
        styles: { ...tableOptions(report).styles, fontSize: 7, cellPadding: 5, overflow: 'linebreak' },
        footStyles: { fillColor: [243, 244, 246], textColor: report.dark, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 58 },
          1: { cellWidth: 72 },
          2: { cellWidth: 78 },
          3: { cellWidth: 56 },
          4: { cellWidth: 144 },
          5: { cellWidth: 56 },
          6: { cellWidth: 70, halign: 'right' },
        },
      });
      previewPdf(report.doc, 'laporan-pembayaran.pdf');
    } catch {
      toast.error('Gagal ekspor PDF');
    } finally {
      setBusy(null);
    }
  };

  const exportMedicalPdf = async () => {
    setBusy('mr-pdf');
    try {
      const { data } = await api.get('/api/v1/reports/medical-records', { params: reportParams() });
      const rows = data.data;
      const report = await createReportDoc('Laporan Rekam Medis', 'landscape');
      autoTable(report.doc, {
        startY: 122,
        head: [['Tgl', 'Pasien', 'No. RM', 'Dokter', 'Keluhan/Pemeriksaan', 'Diagnosis', 'Tindakan', 'Catatan']],
        body: rows.map((r) => [
          r.visit_date?.slice(0, 10),
          r.patient_name,
          r.patient_code,
          r.doctor_name,
          clip(r.complaint, 70),
          clip(r.diagnosis, 70),
          clip(r.treatment, 90),
          clip(r.notes, 90),
        ]),
        ...tableOptions(report),
        styles: { ...tableOptions(report).styles, fontSize: 5.8, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 44 },
          1: { cellWidth: 72 },
          2: { cellWidth: 86 },
          3: { cellWidth: 74 },
          4: { cellWidth: 126 },
          5: { cellWidth: 102 },
          6: { cellWidth: 136 },
          7: { cellWidth: 118 },
        },
      });
      previewPdf(report.doc, 'laporan-rekam-medis.pdf');
    } catch {
      toast.error('Gagal ekspor PDF');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground">
          Preview PDF laporan atau ekspor Excel untuk arsip dan audit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter laporan</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xs space-y-2">
          <label className="text-sm font-medium">Bulan laporan</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pasien</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportPatientsPdf} disabled={busy === 'p-pdf'}>
              <FileText className="mr-2 h-4 w-4" />
              Preview PDF
            </Button>
            <Button variant="outline" onClick={exportPatientsExcel} disabled={busy === 'p-xlsx'}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={exportPaymentsPdf} disabled={busy === 'pay-pdf'}>
              <FileText className="mr-2 h-4 w-4" />
              Preview PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rekam medis</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={exportMedicalPdf} disabled={busy === 'mr-pdf'}>
              <FileText className="mr-2 h-4 w-4" />
              Preview PDF
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
