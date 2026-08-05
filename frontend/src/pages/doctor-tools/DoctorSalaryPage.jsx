import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAttendanceClock, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const SHIFT_SALARY = 50000;
const SHIFT_LABELS = {
  shift1: 'Shift 1 (09:00-15:00)',
  shift2: 'Shift 2 (15:00-21:00)',
};

function shiftLabel(shift) {
  return SHIFT_LABELS[shift] || SHIFT_LABELS.shift1;
}

function monthBounds(month) {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function prettyDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isLateNote(note) {
  return String(note || '').trim().toLowerCase().startsWith('terlambat');
}

function attendanceNote(row) {
  return row?.late_note || row?.note || '';
}

function TableControls() {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <span>Show</span>
        <select className="h-9 rounded border border-slate-300 bg-white px-2 dark:bg-slate-950">
          <option>10</option>
          <option>25</option>
          <option>50</option>
        </select>
        <span>entries</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span>Search:</span>
        <Input className="h-9 w-56 rounded border-slate-300 bg-white dark:bg-slate-950" />
      </div>
    </div>
  );
}

function FilterRow({ labels }) {
  return (
    <tr>
      {labels.map((label) => (
        <td key={label} className="border border-slate-200 px-3 py-3 dark:border-slate-800">
          <Input
            placeholder={label}
            className="h-9 rounded border-slate-300 bg-white text-sm dark:bg-slate-950"
          />
        </td>
      ))}
    </tr>
  );
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border border-slate-200 bg-slate-100 px-3 py-4 text-center text-sm dark:border-slate-800 dark:bg-slate-900"
      >
        No data available in table
      </td>
    </tr>
  );
}

export default function DoctorSalaryPage() {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendance, setAttendance] = useState([]);
  const [salaryRows, setSalaryRows] = useState([]);
  const [actionRows, setActionRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const bounds = useMemo(() => monthBounds(month), [month]);
  const selectedDoctor = doctors.find((d) => String(d.id) === String(doctorId));
  const doctorName = selectedDoctor?.name || user?.name || '-';
  const paidAttendanceRows = attendance.filter((row) => row.status === 'hadir' || row.check_in);
  const totalShift = paidAttendanceRows.length * SHIFT_SALARY;
  const totalActionSalary = actionRows.reduce((sum, row) => sum + Number(row.doctor_service || 0), 0);
  const totalDeduction = actionRows.reduce((sum, row) => sum + Number(row.deduction || 0), 0);
  const grandTotal = totalShift + totalActionSalary;

  const loadDoctors = async () => {
    try {
      const { data } = await api.get('/api/v1/doctors');
      const list = data.data || [];
      setDoctors(list);
      if (role === 'admin' && !doctorId && list[0]) setDoctorId(String(list[0].id));
    } catch {
      toast.error('Gagal memuat dokter');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const attendanceParams = new URLSearchParams({ month });
      const actionParams = new URLSearchParams({ month });
      const salaryParams = new URLSearchParams();
      if (role === 'admin' && doctorId) {
        attendanceParams.set('doctor_id', doctorId);
        actionParams.set('doctor_id', doctorId);
        salaryParams.set('doctor_id', doctorId);
      }
      const [att, sal, actions] = await Promise.all([
        api.get(`/api/v1/attendance?${attendanceParams}`),
        api.get(`/api/v1/doctor-salaries?${salaryParams}`),
        api.get(`/api/v1/doctor-salaries/actions?${actionParams}`),
      ]);
      setAttendance(att.data.data || []);
      setActionRows(actions.data.data || []);
      setSalaryRows(
        (sal.data.data || []).filter((row) => String(row.period_month || '').startsWith(month))
      );
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat data gaji');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    loadData();
  }, [month, doctorId, role]);

  const generateSlip = async () => {
    if (role !== 'admin') {
      toast.error('Slip gaji hanya bisa disimpan oleh admin.');
      return;
    }
    if (!doctorId) {
      toast.error('Pilih dokter terlebih dahulu.');
      return;
    }
    try {
      await api.post('/api/v1/doctor-salaries', {
        doctor_id: Number(doctorId),
        period_month: month,
        amount: grandTotal,
        notes: [
          `Total gaji shift: ${formatCurrency(totalShift)}`,
          `Total gaji tindakan: ${formatCurrency(totalActionSalary)}`,
          `Total pengurangan jasa medis: ${formatCurrency(totalDeduction)}`,
        ].join('\n'),
      });
      toast.success('Slip gaji tersimpan.');
      await loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan slip gaji');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="rounded border-slate-200 bg-white shadow-md shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5">
          <h1 className="mb-3 text-2xl font-medium uppercase tracking-normal">GAJI</h1>

          <div className="mb-5 max-w-xl rounded border border-slate-200 p-4 shadow-sm dark:border-slate-800">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="font-bold">Nama</Label>
                {role === 'admin' ? (
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="flex h-10 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input value={doctorName} readOnly className="rounded border-slate-300 bg-slate-100 dark:bg-slate-900" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Jabatan</Label>
                <Input value="Dokter Gigi" readOnly className="rounded border-slate-300 bg-slate-100 dark:bg-slate-900" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Periode</Label>
                <div className="grid grid-cols-[1fr_56px_1fr] items-center gap-3">
                  <Input
                    type="date"
                    value={bounds.start}
                    readOnly
                    className="rounded border-slate-300 bg-white text-center dark:bg-slate-950"
                  />
                  <span className="text-center">Sampai</span>
                  <Input
                    type="date"
                    value={bounds.end}
                    readOnly
                    className="rounded border-slate-300 bg-white text-center dark:bg-slate-950"
                  />
                </div>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded border-slate-300 bg-white dark:bg-slate-950"
                />
              </div>
              <Button
                type="button"
                className="w-full rounded bg-teal-500 shadow-none hover:bg-teal-600"
                onClick={loadData}
                disabled={loading}
              >
                Tampilkan Data
              </Button>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-3xl font-medium">Riwayat Absen</h2>
            <TableControls />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead>
                  <tr>
                    {[
                      'Tanggal',
                      'Nama',
                      'Jabatan',
                      'Shift',
                      'Absen Masuk',
                      'Absen Pulang',
                      'Catatan Terlambat',
                      'Catatan Pulang Lebih Awal',
                      'Catatan Lembur',
                      'Keterangan',
                      'Gaji Per Shift',
                      'Potongan',
                      'Gaji Lembur',
                      'Total Per Shift',
                    ].map((header) => (
                      <th key={header} className="border border-slate-200 px-3 py-4 text-left dark:border-slate-800">
                        {header} <span className="text-slate-400">↑↓</span>
                      </th>
                    ))}
                  </tr>
                  <FilterRow
                    labels={[
                      'Tanggal',
                      'Nama',
                      'Jabatan',
                      'Shift',
                      'Absen',
                      'Absen',
                      'Catatan',
                      'Cata',
                      'Cata',
                      'Keterangan',
                      'G',
                      'Potong',
                      'Gaji',
                      'Total',
                    ]}
                  />
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <EmptyRow colSpan={14} />
                  ) : (
                    attendance.map((row) => {
                      const note = attendanceNote(row);
                      return (
                      <tr key={row.id}>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{prettyDate(row.work_date)}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.doctor_name}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">Dokter Gigi</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{shiftLabel(row.shift)}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatAttendanceClock(row.check_in)}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatAttendanceClock(row.check_out)}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">-</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">-</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">-</td>
                        <td
                          className={`border border-slate-200 px-3 py-3 font-semibold dark:border-slate-800 ${
                            isLateNote(note) ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {note || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(SHIFT_SALARY)}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">Rp0</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">Rp0</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(SHIFT_SALARY)}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-0">
              <Button type="button" variant="outline" className="rounded-r-none">Previous</Button>
              <Button type="button" variant="outline" className="rounded-l-none">Next</Button>
            </div>
            <p>Total gaji shift: <strong>{formatCurrency(totalShift)}</strong></p>
          </section>

          <SalaryTable
            title="Riwayat Tindakan"
            headers={[
              'Tanggal Rawat',
              'No. Rawat',
              'Nama Dokter',
              'Nama Petugas',
              'Nama Pasien',
              'Tindakan',
              'Tarif',
              'Pengurangan',
              '% Jasa Medis',
              'Jasa Dokter',
            ]}
            filters={['Tanggal', 'No.', 'Nama', 'Nama', 'Nama', 'Tindakan', 'Tarif', 'Pengurangan', '%', 'Jasa Dokter']}
            rows={actionRows}
            renderRow={(row) => (
              <tr key={row.id}>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{prettyDate(row.visit_date)}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">RM-{String(row.medical_record_id).padStart(5, '0')}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.doctor_name}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.staff_name || '-'}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.patient_name}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.actionName}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.tariff)}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.deduction)}</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.medical_service_percent}%</td>
                <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.doctor_service)}</td>
              </tr>
            )}
          />
          <p className="border-b-4 border-slate-400 pb-1">Total gaji tindakan: <strong>{formatCurrency(totalActionSalary)}</strong></p>

          {role === 'admin' && (
            <>
              <SalaryTable
                title="Pengurangan Jasa Medis"
                headers={[
                  'Nama Dokter',
                  'Nama Petugas',
                  'Nama Pasien',
                  'Tindakan',
                  'Pengurangan',
                  'Jumlah',
                  '% Jasa Medis',
                  'Total Pengurangan',
                ]}
                filters={['Nama', 'Nama', 'Nama', 'Tindakan', 'Pengurangan', 'Jumlah', '%', 'Total Pengurangan']}
                rows={actionRows.filter((row) => Number(row.deduction || 0) > 0)}
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.doctor_name}</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.staff_name || '-'}</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.patient_name}</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.actionName}</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.deduction)}</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">1</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.medical_service_percent}%</td>
                    <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.deduction)}</td>
                  </tr>
                )}
              />
              <p>Total pengurangan jasa medis: <strong>{formatCurrency(totalDeduction)}</strong></p>
            </>
          )}

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <tbody>
                <SummaryTotal label="Total Gaji Shift" value={totalShift} />
                <SummaryTotal label="Total Gaji Tindakan" value={totalActionSalary} />
                {role === 'admin' && <SummaryTotal label="Total Pengurangan Jasa Medis" value={totalDeduction} />}
                <SummaryTotal label="Total Gaji" value={grandTotal} strong />
              </tbody>
            </table>
          </div>

          <section className="mt-10 space-y-3">
            <h2 className="text-3xl font-medium">Slip Tersimpan</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-200 px-3 py-4 text-left dark:border-slate-800">Periode</th>
                    <th className="border border-slate-200 px-3 py-4 text-left dark:border-slate-800">Nama Dokter</th>
                    <th className="border border-slate-200 px-3 py-4 text-left dark:border-slate-800">Total Gaji</th>
                    <th className="border border-slate-200 px-3 py-4 text-left dark:border-slate-800">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRows.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    salaryRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.period_month}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{row.doctor_name}</td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">{formatCurrency(row.amount)}</td>
                        <td className="whitespace-pre-line border border-slate-200 px-3 py-3 dark:border-slate-800">{row.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {role === 'admin' && (
            <div className="mt-10 flex justify-center">
              <Button
                type="button"
                className="rounded bg-teal-500 px-8 shadow-none hover:bg-teal-600"
                onClick={generateSlip}
                disabled={loading}
              >
                Generate Slip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SalaryTable({ title, headers, filters, rows = [], renderRow }) {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-3xl font-medium">{title}</h2>
      <TableControls />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="border border-slate-200 px-3 py-5 text-left dark:border-slate-800">
                  {header} <span className="text-slate-400">↑↓</span>
                </th>
              ))}
            </tr>
            <FilterRow labels={filters} />
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={headers.length} /> : rows.map(renderRow)}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-0">
        <Button type="button" variant="outline" className="rounded-r-none">Previous</Button>
        <Button type="button" variant="outline" className="rounded-l-none">Next</Button>
      </div>
    </section>
  );
}

function SummaryTotal({ label, value, strong }) {
  return (
    <tr className={strong ? 'bg-slate-300 font-bold dark:bg-slate-800' : 'odd:bg-slate-100 dark:odd:bg-slate-900'}>
      <td className="border border-slate-200 px-4 py-4 dark:border-slate-800">{label}</td>
      <td className="w-[220px] border border-slate-200 px-4 py-4 dark:border-slate-800">
        {formatCurrency(value)}
      </td>
    </tr>
  );
}
