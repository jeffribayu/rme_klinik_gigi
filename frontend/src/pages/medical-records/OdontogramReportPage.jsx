import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ODONTOGRAM_ROWS } from '@/components/odontogram/odontogramConfig';
import { ageFromBirthDate, formatDate } from '@/lib/utils';

const CLINIC = {
  name: 'linsea dental care',
  address:
    'Jl. Batang Hari, Spa Kuamang Kuning, Kec. Pelepat, Kab. Bungo, Jambi, Indonesia',
};

const CONDITION_SYMBOL = {
  sehat: '',
  karies: 'O',
  tambalan: '●',
  dicabut: 'X',
  implant: 'Imp',
  akar: 'V',
};

function toothCondition(o) {
  if (!o) return 'sehat';
  return o.condition_type || o.conditionType || 'sehat';
}

function ReportTooth({ number, condition }) {
  const sym = CONDITION_SYMBOL[condition] || '';
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[40px] w-[28px] rounded-sm border border-zinc-900 bg-white print:h-[36px] print:w-[26px] print:border-black">
        <div className="absolute left-0 right-0 top-[26%] border-t border-zinc-800/70 print:border-black" />
        <div className="absolute bottom-[26%] left-0 right-0 border-t border-zinc-800/70 print:border-black" />
        <div className="absolute bottom-0 left-[30%] top-0 border-l border-zinc-800/70 print:border-black" />
        <div className="absolute bottom-0 right-[30%] top-0 border-l border-zinc-800/70 print:border-black" />
        {sym ? (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none text-zinc-900 print:text-[10px] print:text-black">
            {sym}
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 text-[8px] font-bold tabular-nums text-zinc-800 print:text-[8px] print:text-black">
        {number}
      </span>
    </div>
  );
}

function buildToothMap(odontograms) {
  const m = {};
  (odontograms || []).forEach((o) => {
    m[o.tooth_number] = toothCondition(o);
  });
  return m;
}

function buildCatatan(mr) {
  const parts = [];
  if (mr?.notes?.trim()) parts.push(mr.notes.trim());
  (mr?.odontograms || []).forEach((o) => {
    if (o.notes?.trim()) {
      parts.push(`Gigi ${o.tooth_number}: ${o.notes.trim()}`);
    }
  });
  return parts.length ? parts.join('\n\n') : '—';
}

export default function OdontogramReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mr, setMr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/medical-records/${id}`);
        setMr(data.data);
      } catch {
        toast.error('Rekam medis tidak ditemukan');
        navigate('/medical-records');
      }
    })();
  }, [id, navigate]);

  const toothMap = useMemo(() => buildToothMap(mr?.odontograms), [mr]);

  if (!mr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-muted-foreground">
        Memuat laporan…
      </div>
    );
  }

  const ttl =
    mr.patient_birth_date != null
      ? `${formatDate(mr.patient_birth_date)} / ${ageFromBirthDate(mr.patient_birth_date) ?? '—'} tahun`
      : '—';

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between gap-2 px-4">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/medical-records/${mr.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Cetak / PDF
        </Button>
      </div>

      <div className="odontogram-report-print-area mx-auto max-w-[210mm] bg-white px-6 py-8 text-zinc-900 shadow-lg print:mx-0 print:max-w-none print:px-5 print:py-5 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-zinc-900 pb-4 print:border-black print:pb-3">
          <div className="flex gap-3">
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="h-14 w-14 shrink-0 rounded-lg object-contain ring-1 ring-zinc-200 print:h-12 print:w-12 print:ring-black/20"
            />
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide text-zinc-900 print:text-xl print:text-black">
                {CLINIC.name}
              </h1>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-700 print:max-w-[155mm] print:text-xs print:leading-snug print:text-black">
                {CLINIC.address}
              </p>
            </div>
          </div>
          <div className="flex min-h-[52px] min-w-[100px] flex-col border-2 border-zinc-900 p-2 text-center print:border-black print:p-2">
            <span className="text-[10px] font-semibold uppercase text-zinc-600 print:text-[10px] print:text-black">
              No. RM
            </span>
            <span className="text-sm font-bold tabular-nums print:text-sm">{mr.id}</span>
            <span className="text-[10px] text-zinc-500 print:text-[10px] print:text-black">{mr.patient_code}</span>
          </div>
        </header>

        <section className="mt-5 border-b border-zinc-400 pb-4 print:mt-4 print:pb-3 print:border-black">
          <div className="max-w-xl space-y-1.5 text-sm print:space-y-1 print:text-sm">
            <Row label="Nama" value={mr.patient_name} />
            <Row
              label="L / P"
              value={
                mr.patient_gender === 'L'
                  ? 'Laki-laki'
                  : mr.patient_gender === 'P'
                    ? 'Perempuan'
                    : '—'
              }
            />
            <Row label="TTL / Umur" value={ttl} />
            <Row label="Alamat" value={mr.patient_address || '—'} multiline />
          </div>
        </section>

        <section className="mt-5 print:mt-4">
          <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-wider text-zinc-900 print:mb-2 print:text-sm print:text-black">
            Odontogram
          </h2>
          <div className="space-y-3 rounded-lg border border-zinc-300 bg-slate-50/50 p-4 print:space-y-2 print:border-black print:bg-white print:p-3">
            {ODONTOGRAM_ROWS.map((row, idx) => (
              <div key={row.key}>
                <p className="mb-1.5 text-center text-[10px] font-bold uppercase text-zinc-600 print:text-[10px] print:text-black">
                  {row.shortLabel}
                </p>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 print:gap-1">
                  {row.teeth.map((n) => (
                    <ReportTooth key={n} number={n} condition={toothMap[n] || 'sehat'} />
                  ))}
                </div>
                {idx === 1 && (
                  <div className="py-1.5 text-center text-base leading-none text-zinc-500 print:text-base print:text-black">
                    ↕
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Keterangan (legenda 2 kolom) + Catatan (kotak di bawah) — sama di layar & PDF */}
        <div className="mt-5 flex flex-col gap-4 print:mt-4 print:gap-4">
          <div className="rounded-lg border-2 border-zinc-900 p-4 print:rounded-lg print:border-black print:p-4">
            <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-900 print:mb-3 print:text-sm print:text-black">
              Keterangan
            </h3>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-2 text-xs leading-snug text-zinc-800 sm:grid-cols-2 print:grid-cols-2 print:gap-x-8 print:text-xs print:leading-snug print:text-black">
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  V
                </span>
                <span>= sisa akar</span>
              </li>
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  o
                </span>
                <span>= gigi berlubang (karies)</span>
              </li>
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  •
                </span>
                <span>= tambalan</span>
              </li>
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  X
                </span>
                <span>= gigi hilang / dicabut</span>
              </li>
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  Imp
                </span>
                <span>= implant</span>
              </li>
              <li className="flex gap-1">
                <span className="inline-block min-w-[2.25rem] font-mono font-bold text-zinc-900 print:text-black">
                  |—|
                </span>
                <span>= gigi belum tumbuh (belum terekam di sistem)</span>
              </li>
            </ul>
          </div>

          <div className="flex min-h-[140px] flex-col rounded-lg border-2 border-zinc-900 p-4 print:min-h-[140px] print:border-black print:p-4">
            <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-900 print:mb-3 print:text-sm print:text-black">
              Catatan
            </h3>
            <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 print:text-sm print:leading-snug print:text-black">
              {buildCatatan(mr)}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-500 print:mt-4 print:text-[10px] print:text-black">
          Dokumen ini dibuat dari sistem RME — linsea dental care
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, multiline }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-zinc-300 pb-1 print:border-black print:pb-0.5">
      <span className="w-28 shrink-0 text-sm font-semibold text-zinc-700 print:w-28 print:text-sm print:text-black">
        {label}
      </span>
      <span
        className={`min-w-0 flex-1 text-sm text-zinc-900 print:text-sm print:leading-snug print:text-black ${multiline ? 'whitespace-pre-wrap' : ''}`}
      >
        {value || '—'}
      </span>
    </div>
  );
}
