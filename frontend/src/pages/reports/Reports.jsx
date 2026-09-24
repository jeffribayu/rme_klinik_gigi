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

async function createReportDoc(title, orientation = 'portrait', format = 'a4') {
  const doc = new jsPDF({ unit: 'pt', format, orientation });
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

function formatReportMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function setFormulaCell(sheet, rowNumber, columnNumber, formula, value) {
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnNumber - 1 });
  sheet[address] = { t: 'n', v: Number(value) || 0, f: formula };
}

function ageGenderCount(row, key, gender) {
  const value = row.new_by_age_sex?.[key]?.[gender] ?? row.new_by_age?.[key]?.[gender];
  return Number(value) || 0;
}

function writeDentalReportExcel(report) {
  const monthLabel = formatReportMonth(report.month).toUpperCase();
  const ageKeys = report.age_bands.map((band) => band.key);
  const ageColumnCount = ageKeys.length * 2;
  const newCaseColumnCount = ageColumnCount + 3;
  const totalColumnCount = 3 + newCaseColumnCount + 3;
  const lastColumnIndex = totalColumnCount - 1;
  const newMaleColumn = ageColumnCount + 4;
  const newFemaleColumn = ageColumnCount + 5;
  const newTotalColumn = ageColumnCount + 6;
  const oldMaleColumn = ageColumnCount + 7;
  const oldFemaleColumn = ageColumnCount + 8;
  const oldTotalColumn = ageColumnCount + 9;
  const diseaseRows = report.diseases.map((row) => [
    row.no,
    row.name,
    row.icd,
    ...ageKeys.flatMap((key) => [
      ageGenderCount(row, key, 'male'),
      ageGenderCount(row, key, 'female'),
    ]),
    row.new_male,
    row.new_female,
    row.new_total,
    row.old_male,
    row.old_female,
    row.old_total,
  ]);
  const diseaseDataStart = 10;
  const diseaseSheet = XLSX.utils.aoa_to_sheet([
    ['FORMULIR 13'],
    ['LAPORAN BULANAN KESAKITAN GIGI DAN MULUT'],
    ['RS/KLINIK/PRAKTIK: LINSEA DENTAL CARE'],
    [`BULAN: ${monthLabel}`],
    [],
    [
      'No.',
      'Jenis Penyakit / Tindakan',
      'ICD 10',
      'JUMLAH KASUS BARU (Umur dan Jenis Kelamin)',
      ...Array.from({ length: newCaseColumnCount - 1 }, () => ''),
      'JUMLAH KASUS LAMA',
      '',
      '',
    ],
    [
      '',
      '',
      '',
      ...report.age_bands.flatMap((band) => [band.label, '']),
      'L',
      'P',
      'JML',
      'L',
      'P',
      'JML',
    ],
    ['', '', '', ...report.age_bands.flatMap(() => ['L', 'P']), '', '', '', '', '', ''],
    Array.from({ length: totalColumnCount }, (_, index) => index + 1),
    ...diseaseRows,
    [],
    ['Catatan:', report.notes.join(' ')],
    ['Acuan format:', 'Formulir 13 Permenkes Nomor 31 Tahun 2019 tentang Sistem Informasi Puskesmas.'],
  ]);
  diseaseSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumnIndex } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastColumnIndex } },
    { s: { r: 5, c: 0 }, e: { r: 7, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 7, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 7, c: 2 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: 3 + newCaseColumnCount - 1 } },
    { s: { r: 5, c: 3 + newCaseColumnCount }, e: { r: 5, c: lastColumnIndex } },
    ...report.age_bands.map((_, index) => ({
      s: { r: 6, c: 3 + index * 2 },
      e: { r: 6, c: 4 + index * 2 },
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      s: { r: 6, c: 3 + ageColumnCount + index },
      e: { r: 7, c: 3 + ageColumnCount + index },
    })),
    { s: { r: diseaseDataStart + diseaseRows.length, c: 1 }, e: { r: diseaseDataStart + diseaseRows.length, c: lastColumnIndex } },
    { s: { r: diseaseDataStart + diseaseRows.length + 1, c: 1 }, e: { r: diseaseDataStart + diseaseRows.length + 1, c: lastColumnIndex } },
  ];
  diseaseSheet['!cols'] = [
    { wch: 5 },
    { wch: 40 },
    { wch: 11 },
    ...Array.from({ length: ageColumnCount }, () => ({ wch: 5 })),
    ...Array.from({ length: 6 }, () => ({ wch: 8 })),
  ];
  diseaseSheet['!rows'] = [
    { hpt: 18 }, { hpt: 24 }, { hpt: 18 }, { hpt: 18 }, {}, { hpt: 30 }, { hpt: 26 }, { hpt: 20 }, { hpt: 18 },
  ];
  diseaseSheet['!freeze'] = { xSplit: 3, ySplit: 9 };
  diseaseSheet['!pageSetup'] = { orientation: 'landscape', paperSize: 8, fitToWidth: 1, fitToHeight: 0 };
  diseaseSheet['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  report.diseases.forEach((row, index) => {
    const excelRow = diseaseDataStart + index;
    const newMaleLetter = XLSX.utils.encode_col(newMaleColumn - 1);
    const newFemaleLetter = XLSX.utils.encode_col(newFemaleColumn - 1);
    const oldMaleLetter = XLSX.utils.encode_col(oldMaleColumn - 1);
    const oldFemaleLetter = XLSX.utils.encode_col(oldFemaleColumn - 1);
    setFormulaCell(
      diseaseSheet,
      excelRow,
      newTotalColumn,
      `SUM(${newMaleLetter}${excelRow}:${newFemaleLetter}${excelRow})`,
      row.new_total
    );
    setFormulaCell(
      diseaseSheet,
      excelRow,
      oldTotalColumn,
      `SUM(${oldMaleLetter}${excelRow}:${oldFemaleLetter}${excelRow})`,
      row.old_total
    );
  });

  const activityRows = report.activities.map((row) => [
    row.no,
    `${row.indent ? '   ' : ''}${row.label}`,
    row.type === 'data' ? row.male : '',
    row.type === 'data' ? row.female : '',
    row.type === 'data' ? row.total : '',
  ]);
  const activityDataStart = 7;
  const activitySheet = XLSX.utils.aoa_to_sheet([
    ['LAPORAN BULANAN KEGIATAN PELAYANAN GIGI DAN MULUT'],
    ['RS/KLINIK/PRAKTIK: LINSEA DENTAL CARE'],
    [`BULAN: ${monthLabel}`],
    [],
    ['NO', 'KEGIATAN', 'PRAKTIK', '', 'TOTAL'],
    ['', '', 'L', 'P', ''],
    ...activityRows,
    [],
    ['Catatan:', report.notes[1]],
  ]);
  activitySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
    { s: { r: 4, c: 4 }, e: { r: 5, c: 4 } },
    { s: { r: activityDataStart + activityRows.length, c: 1 }, e: { r: activityDataStart + activityRows.length, c: 4 } },
  ];
  activitySheet['!cols'] = [{ wch: 7 }, { wch: 58 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  activitySheet['!freeze'] = { xSplit: 2, ySplit: 6 };
  activitySheet['!pageSetup'] = { orientation: 'portrait', paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
  activitySheet['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  report.activities.forEach((row, index) => {
    if (row.type !== 'data') return;
    const excelRow = activityDataStart + index;
    setFormulaCell(activitySheet, excelRow, 5, `SUM(C${excelRow}:D${excelRow})`, row.total);
  });

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `Laporan Bulanan Kesakitan Gigi dan Mulut ${formatReportMonth(report.month)}`,
    Subject: 'Formulir 13 dan rekap kegiatan pelayanan gigi dan mulut',
    Author: 'Linsea Dental Care',
  };
  XLSX.utils.book_append_sheet(workbook, diseaseSheet, 'Kesakitan Gigi Mulut');
  XLSX.utils.book_append_sheet(workbook, activitySheet, 'Kegiatan Pelayanan');
  XLSX.writeFile(workbook, `laporan-gigi-mulut-${report.month}.xlsx`, {
    compression: true,
    cellStyles: true,
  });
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

  const loadDentalReport = async () => {
    const { data } = await api.get('/api/v1/reports/dental-morbidity', { params: reportParams() });
    return data.data;
  };

  const exportDentalPdf = async () => {
    setBusy('dental-pdf');
    try {
      const data = await loadDentalReport();
      const monthLabel = formatReportMonth(data.month);
      const report = await createReportDoc('Laporan Kesakitan Gigi dan Mulut', 'landscape', 'a3');
      report.doc.setFont('helvetica', 'bold');
      report.doc.setFontSize(10);
      report.doc.setTextColor(...report.dark);
      report.doc.text(
        `FORMULIR 13    RS/Klinik/Praktik: Linsea Dental Care    Bulan: ${monthLabel}`,
        report.margin,
        112
      );

      autoTable(report.doc, {
        startY: 126,
        head: [
          [
            { content: 'No.', rowSpan: 3 },
            { content: 'Jenis Penyakit / Tindakan', rowSpan: 3 },
            { content: 'ICD 10', rowSpan: 3 },
            {
              content: 'JUMLAH KASUS BARU (Umur dan Jenis Kelamin)',
              colSpan: data.age_bands.length * 2 + 3,
            },
            { content: 'JUMLAH KASUS LAMA', colSpan: 3 },
          ],
          [
            ...data.age_bands.map((band) => ({ content: band.label, colSpan: 2 })),
            { content: 'L', rowSpan: 2 },
            { content: 'P', rowSpan: 2 },
            { content: 'JML', rowSpan: 2 },
            { content: 'L', rowSpan: 2 },
            { content: 'P', rowSpan: 2 },
            { content: 'JML', rowSpan: 2 },
          ],
          data.age_bands.flatMap(() => ['L', 'P']),
          Array.from({ length: 9 + data.age_bands.length * 2 }, (_, index) => String(index + 1)),
        ],
        body: data.diseases.map((row) => [
          row.no,
          row.name,
          row.icd,
          ...data.age_bands.flatMap((band) => [
            ageGenderCount(row, band.key, 'male'),
            ageGenderCount(row, band.key, 'female'),
          ]),
          row.new_male,
          row.new_female,
          row.new_total,
          row.old_male,
          row.old_female,
          row.old_total,
        ]),
        ...tableOptions(report),
        margin: { left: 32, right: 32, top: 32, bottom: 32 },
        styles: {
          ...tableOptions(report).styles,
          fontSize: 4.6,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          ...tableOptions(report).headStyles,
          fontSize: 4.8,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 168, halign: 'left' },
          2: { cellWidth: 44 },
          ...Object.fromEntries(
            Array.from({ length: data.age_bands.length * 2 }, (_, index) => [
              index + 3,
              { cellWidth: 31 },
            ])
          ),
          ...Object.fromEntries(
            Array.from({ length: 6 }, (_, index) => [
              index + 3 + data.age_bands.length * 2,
              { cellWidth: 39 },
            ])
          ),
        },
        didParseCell: (cell) => {
          if (cell.section === 'head' && cell.row.index === 3) {
            cell.cell.styles.fillColor = [209, 213, 219];
            cell.cell.styles.textColor = report.dark;
          }
          const source = data.diseases[cell.row.index];
          if (cell.section === 'body' && source?.source === 'treatment') {
            cell.cell.styles.fillColor = [240, 253, 250];
          }
        },
      });

      const noteY = Math.min((report.doc.lastAutoTable?.finalY || 620) + 18, 805);
      report.doc.setFont('helvetica', 'normal');
      report.doc.setFontSize(7.5);
      report.doc.text([data.notes[0], data.notes[4]].filter(Boolean).join(' '), report.margin, noteY, {
        maxWidth: report.pageWidth - report.margin * 2,
      });

      report.doc.addPage('a3', 'landscape');
      report.doc.setFillColor(...report.teal);
      report.doc.rect(0, 0, report.pageWidth, 80, 'F');
      report.doc.setTextColor(255, 255, 255);
      report.doc.setFont('helvetica', 'bold');
      report.doc.setFontSize(18);
      report.doc.text('Laporan Kegiatan Pelayanan Gigi dan Mulut', report.margin, 38);
      report.doc.setFontSize(10);
      report.doc.text(`Linsea Dental Care - ${monthLabel}`, report.margin, 58);

      autoTable(report.doc, {
        startY: 104,
        head: [
          [
            { content: 'NO', rowSpan: 2 },
            { content: 'KEGIATAN', rowSpan: 2 },
            { content: 'PRAKTIK', colSpan: 2 },
            { content: 'TOTAL', rowSpan: 2 },
          ],
          ['L', 'P'],
        ],
        body: data.activities.map((row) => [
          row.no,
          `${row.indent ? '   ' : ''}${row.label}`,
          row.type === 'data' ? row.male : '',
          row.type === 'data' ? row.female : '',
          row.type === 'data' ? row.total : '',
        ]),
        ...tableOptions(report),
        margin: { left: 170, right: 170 },
        styles: {
          ...tableOptions(report).styles,
          fontSize: 8,
          cellPadding: 5,
          valign: 'middle',
        },
        headStyles: {
          ...tableOptions(report).headStyles,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 45, halign: 'center' },
          1: { cellWidth: 520 },
          2: { cellWidth: 90, halign: 'center' },
          3: { cellWidth: 90, halign: 'center' },
          4: { cellWidth: 105, halign: 'center' },
        },
        didParseCell: (cell) => {
          if (cell.section !== 'body') return;
          const source = data.activities[cell.row.index];
          if (source?.type === 'section') {
            cell.cell.styles.fillColor = [229, 231, 235];
            cell.cell.styles.fontStyle = 'bold';
          } else if (source?.type === 'label') {
            cell.cell.styles.fontStyle = 'bold';
          }
        },
      });
      const activityNoteY = (report.doc.lastAutoTable?.finalY || 700) + 18;
      report.doc.setTextColor(...report.dark);
      report.doc.setFont('helvetica', 'normal');
      report.doc.setFontSize(8);
      report.doc.text(data.notes[1], 170, activityNoteY, { maxWidth: report.pageWidth - 340 });

      previewPdf(report.doc, `laporan-gigi-mulut-${data.month}.pdf`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal membuat laporan gigi dan mulut');
    } finally {
      setBusy(null);
    }
  };

  const exportDentalExcel = async () => {
    setBusy('dental-xlsx');
    try {
      const data = await loadDentalReport();
      writeDentalReportExcel(data);
      toast.success('Excel laporan gigi dan mulut diunduh');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal ekspor laporan gigi dan mulut');
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Laporan bulanan kesakitan gigi dan mulut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Formulir 13 dan rekap kegiatan pelayanan dalam dua tabel, lengkap dengan kelompok umur,
              jenis kelamin, kasus baru/lama, kunjungan, dan jenis tindakan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportDentalPdf} disabled={busy === 'dental-pdf'}>
                <FileText className="mr-2 h-4 w-4" />
                Preview PDF
              </Button>
              <Button variant="outline" onClick={exportDentalExcel} disabled={busy === 'dental-xlsx'}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel 2 Tabel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Karena data penjamin belum tersedia di rekam medis, seluruh kunjungan saat ini dihitung
              sebagai kunjungan umum dan kunjungan JKN bernilai 0.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
