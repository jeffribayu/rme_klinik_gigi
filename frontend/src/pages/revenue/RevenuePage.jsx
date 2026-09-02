import { useEffect, useMemo, useState } from 'react';
import { Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

const SHIFT_SALARY = 50000;

function monthNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export default function RevenuePage() {
  const [month, setMonth] = useState(monthNow);
  const [payments, setPayments] = useState([]);
  const [actions, setActions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const bounds = useMemo(() => monthBounds(month), [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const paymentParams = new URLSearchParams({
        status: 'lunas',
        from: bounds.from,
        to: bounds.to,
      });
      const [paymentRes, actionRes, attendanceRes] = await Promise.all([
        api.get(`/api/v1/payments?${paymentParams}`),
        api.get(`/api/v1/doctor-salaries/actions?month=${month}`),
        api.get(`/api/v1/attendance?month=${month}`),
      ]);
      setPayments(paymentRes.data.data || []);
      setActions(actionRes.data.data || []);
      setAttendance(attendanceRes.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat rekap pendapatan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const grossRevenue = payments.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
  const medicalService = actions.reduce((sum, row) => sum + Number(row.doctor_service || 0), 0);
  const paidAttendance = attendance.filter((row) => row.status === 'hadir' || row.check_in);
  const shiftSalary = paidAttendance.length * SHIFT_SALARY;
  const totalExpense = medicalService + shiftSalary;
  const netRevenue = grossRevenue - totalExpense;

  const summaryCards = [
    {
      title: 'Pendapatan Kotor',
      value: grossRevenue,
      icon: Wallet,
      className: 'from-sky-600 to-blue-600',
    },
    {
      title: 'Jasa Dokter Tindakan',
      value: medicalService,
      icon: TrendingDown,
      className: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Gaji Shift Dokter',
      value: shiftSalary,
      icon: Banknote,
      className: 'from-violet-600 to-indigo-600',
    },
    {
      title: 'Pendapatan Bersih',
      value: netRevenue,
      icon: TrendingUp,
      className: netRevenue >= 0 ? 'from-emerald-600 to-teal-600' : 'from-rose-600 to-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Rekap Pendapatan</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan pendapatan kotor dan bersih berdasarkan pembayaran lunas, jasa dokter, dan gaji shift.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Label>Filter bulan</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ title, value, icon: Icon, className }) => (
            <Card key={title} className={`overflow-hidden bg-gradient-to-br ${className} text-white shadow-lg`}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm font-semibold text-white/85">{title}</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="truncate text-2xl font-bold">{formatCurrency(value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rincian Pembayaran Lunas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-teal-600 text-left text-white">
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Pasien</th>
                    <th className="px-3 py-3">No. RM</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border px-3 py-8 text-center text-muted-foreground">
                        Belum ada pembayaran lunas pada bulan ini.
                      </td>
                    </tr>
                  ) : (
                    payments.map((row) => (
                      <tr key={row.id} className="odd:bg-slate-50 dark:odd:bg-slate-900/60">
                        <td className="border px-3 py-3">{formatDate(row.created_at)}</td>
                        <td className="border px-3 py-3">{row.invoice_number}</td>
                        <td className="border px-3 py-3">{row.patient_name}</td>
                        <td className="border px-3 py-3">{row.patient_code}</td>
                        <td className="border px-3 py-3 text-right font-semibold">{formatCurrency(row.total_price)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perhitungan Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <SummaryRow label="Pendapatan kotor" value={grossRevenue} />
                <SummaryRow label="Jasa dokter tindakan" value={medicalService} muted />
                <SummaryRow label={`Gaji shift (${paidAttendance.length} x ${formatCurrency(SHIFT_SALARY)})`} value={shiftSalary} muted />
                <SummaryRow label="Total pengeluaran" value={totalExpense} muted />
                <SummaryRow label="Pendapatan bersih" value={netRevenue} strong />
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted, strong }) {
  return (
    <tr className={strong ? 'bg-teal-600 text-white' : muted ? 'bg-slate-50 dark:bg-slate-900/60' : ''}>
      <td className="border px-3 py-3 font-medium">{label}</td>
      <td className="border px-3 py-3 text-right font-semibold">{formatCurrency(value)}</td>
    </tr>
  );
}
