import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Bed,
  CalendarDays,
  ClipboardList,
  FileText,
  Settings,
  Stethoscope,
  TrendingUp,
  UserPlus,
  UserRound,
  UserRoundPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const chartMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const PIE_COLORS = ['#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0', '#9966ff', '#ff9f40', '#f15bb5', '#c9cbcf'];

function toNumber(value) {
  return Number(value || 0);
}

function normalizeTrend(rows, valueKey, fallbackRows, fallbackKey) {
  const source = rows?.length ? rows : fallbackRows || [];
  return source.map((item) => ({
    name: item.period || item.name,
    value: toNumber(item[valueKey] ?? item[fallbackKey]),
  }));
}

function sumTrend(rows) {
  return rows.reduce((sum, item) => sum + toNumber(item.value), 0);
}

function PinkHeader({ value, label, icon: Icon }) {
  return (
    <div className="relative min-h-[104px] overflow-hidden rounded-t-md bg-[#fb7fa5] px-4 py-4 text-slate-900 shadow-sm">
      <p className="text-4xl font-semibold leading-none">{value}</p>
      <p className="mt-5 text-sm font-medium uppercase tracking-normal sm:text-base">{label}</p>
      <Icon className="pointer-events-none absolute right-5 top-5 h-16 w-16 text-rose-900/18 sm:h-20 sm:w-20" strokeWidth={2.5} />
    </div>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function TrendCard({ value, title, icon, data, color, legend, className = '' }) {
  return (
    <motion.div {...chartMotion} className={className}>
      <Card className="overflow-hidden rounded-md border-slate-200 bg-white shadow-md dark:bg-slate-950">
        <PinkHeader value={value} label={title} icon={icon} />
        <CardContent className="h-[280px] p-4 sm:h-[320px]">
          {data.length === 0 ? (
            <EmptyChart>Belum ada data.</EmptyChart>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 18, right: 18, left: -18, bottom: 32 }}>
                <CartesianGrid stroke="#d8d8d8" strokeOpacity={0.72} />
                <XAxis
                  dataKey="name"
                  angle={-40}
                  textAnchor="end"
                  height={58}
                  interval={0}
                  tick={{ fontSize: 11, fill: '#667085' }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#667085' }} />
                <Tooltip
                  formatter={(v) => [v, legend]}
                  contentStyle={{ borderRadius: 4, borderColor: '#d0d5dd' }}
                />
                <Legend verticalAlign="top" height={24} />
                <Line
                  type="linear"
                  dataKey="value"
                  name={legend}
                  stroke={color}
                  strokeWidth={4}
                  dot={{ fill: color, stroke: color, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DemographyPie({ title, data }) {
  const safeData = data?.length ? data.filter((item) => item.value > 0) : [];

  return (
    <div className="min-h-[270px]">
      <p className="mb-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {safeData.length === 0 ? (
        <EmptyChart>Belum ada data.</EmptyChart>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="46%"
              outerRadius={82}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {safeData.map((entry, index) => (
                <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 4, borderColor: '#d0d5dd' }} />
            <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.user?.role);
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [s, t, a] = await Promise.all([
          api.get('/api/v1/dashboard/stats'),
          api.get('/api/v1/dashboard/today-appointments'),
          api.get('/api/v1/dashboard/recent-activity'),
        ]);
        if (!cancel) {
          setStats(s.data.data);
          setToday(t.data.data);
          setActivity(a.data.data);
        }
      } catch {
        /* toast elsewhere */
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const dashboardCopy = {
    admin: {
      title: 'Dashboard Admin',
      subtitle: 'Kelola input data, master klinik, pembayaran, dan laporan.',
      actions: [
        { to: '/patients/new', label: 'Input Pasien Baru', icon: UserPlus },
        { to: '/settings/treatments', label: 'Master Tindakan', icon: ClipboardList },
        { to: '/settings/doctors', label: 'Master Dokter', icon: Stethoscope },
        { to: '/payments', label: 'Input Pembayaran', icon: Wallet },
      ],
    },
    doctor: {
      title: 'Dashboard Dokter',
      subtitle: 'Fokus pada antrian, pemeriksaan pasien, rekam medis, dan resep.',
      actions: [
        { to: '/appointments', label: 'Buka Antrian', icon: CalendarDays },
        { to: '/medical-records', label: 'Rekam Medis', icon: FileText },
        { to: '/odontogram', label: 'Odontogram', icon: Stethoscope },
        { to: '/obat', label: 'Obat & Resep', icon: Activity },
      ],
    },
    nurse: {
      title: 'Dashboard Perawat',
      subtitle: 'Bantu input pasien, jadwal, antrian, dan pembayaran.',
      actions: [
        { to: '/patients/new', label: 'Input Pasien', icon: UserPlus },
        { to: '/appointments', label: 'Antrian Pasien', icon: CalendarDays },
        { to: '/payments', label: 'Pembayaran', icon: Wallet },
        { to: '/settings/profile', label: 'Profil', icon: Settings },
      ],
    },
  };

  const copy = dashboardCopy[role] || dashboardCopy.nurse;
  const visitTrend = useMemo(
    () => normalizeTrend(stats?.visitsByDay, 'visits', stats?.visitsByMonth, 'visits'),
    [stats]
  );
  const newPatientTrend = useMemo(
    () => normalizeTrend(stats?.newPatientsByDay, 'patients', [], 'patients'),
    [stats]
  );
  const treatmentTrend = useMemo(
    () => normalizeTrend(stats?.treatmentsByDay, 'treatments', stats?.visitsByMonth, 'visits'),
    [stats]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalVisits = stats?.totalMedicalRecords ?? sumTrend(visitTrend);
  const totalNewPatients = stats?.totalNewPatients ?? sumTrend(newPatientTrend);
  const totalTreatments = stats?.totalTreatments ?? sumTrend(treatmentTrend);
  const demographics = stats?.patientDemographics || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.title}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{copy.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {copy.actions.map(({ to, label, icon: Icon }) => (
          <Button
            key={to}
            asChild
            variant="outline"
            className="h-12 justify-start rounded-md bg-white shadow-none dark:bg-slate-950"
          >
            <Link to={to}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <motion.div {...chartMotion} transition={{ delay: 0 }}>
          <Card className="group relative flex min-h-[120px] flex-col overflow-hidden border-teal-300/40 bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-white shadow-lg shadow-teal-500/20 dark:border-teal-400/20 dark:shadow-teal-950/40 sm:min-h-[132px]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform group-hover:scale-125" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-emerald-200/25 blur-2xl" />
            <CardHeader className="relative flex min-h-[58px] flex-row items-start justify-between gap-3 pb-2">
              <CardTitle className="pt-1 text-sm font-semibold leading-tight text-white/85">
                Total Pasien
              </CardTitle>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/25">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative mt-auto pt-0">
              <p className="text-3xl font-bold leading-none">{stats?.totalPatients ?? 0}</p>
              <p className="mt-2 text-xs leading-4 text-white/75">&nbsp;</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...chartMotion} transition={{ delay: 0.05 }}>
          <Card className="group relative flex min-h-[120px] flex-col overflow-hidden border-sky-300/40 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20 dark:border-sky-400/20 dark:shadow-sky-950/40 sm:min-h-[132px]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform group-hover:scale-125" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-cyan-200/25 blur-2xl" />
            <CardHeader className="relative flex min-h-[58px] flex-row items-start justify-between gap-3 pb-2">
              <CardTitle className="pt-1 text-sm font-semibold leading-tight text-white/85">
                {role === 'admin' ? 'Jadwal Diinput' : 'Antrian Pasien'}
              </CardTitle>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/25">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative mt-auto pt-0">
              <p className="text-3xl font-bold leading-none">{stats?.totalAppointments ?? 0}</p>
              <p className="mt-2 text-xs leading-4 text-white/75">&nbsp;</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...chartMotion} transition={{ delay: 0.1 }}>
          <Card className="group relative flex min-h-[120px] flex-col overflow-hidden border-emerald-300/40 bg-gradient-to-br from-emerald-500 via-teal-500 to-lime-500 text-white shadow-lg shadow-emerald-500/20 dark:border-emerald-400/20 dark:shadow-emerald-950/40 sm:min-h-[132px]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform group-hover:scale-125" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-lime-200/25 blur-2xl" />
            <CardHeader className="relative flex min-h-[58px] flex-row items-start justify-between gap-3 pb-2">
              <CardTitle className="pt-1 text-sm font-semibold leading-tight text-white/85">
                {role === 'doctor' ? 'Pemeriksaan selesai' : 'Pembayaran lunas'}
              </CardTitle>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/25">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative mt-auto pt-0">
              <p className="text-3xl font-bold leading-none">{stats?.totalPayments ?? 0}</p>
              <p className="mt-2 text-xs leading-4 text-white/75">
                {role === 'doctor' ? 'Data klinis hari ini' : 'Total transaksi selesai'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...chartMotion} transition={{ delay: 0.15 }}>
          <Card className="group relative flex min-h-[120px] flex-col overflow-hidden border-violet-300/40 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white shadow-lg shadow-violet-500/20 dark:border-violet-400/20 dark:shadow-violet-950/40 sm:min-h-[132px]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform group-hover:scale-125" />
            <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-pink-200/25 blur-2xl" />
            <CardHeader className="relative flex min-h-[58px] flex-row items-start justify-between gap-3 pb-2">
              <CardTitle className="pt-1 text-sm font-semibold leading-tight text-white/85">
                {role === 'admin' ? 'Pendapatan bulan ini' : 'Kunjungan bulan ini'}
              </CardTitle>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/25">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative mt-auto pt-0">
              <p className="truncate text-3xl font-bold leading-none">
                {role === 'admin' ? formatCurrency(stats?.monthlyRevenue) : stats?.totalMedicalRecords ?? 0}
              </p>
              <p className="mt-2 text-xs leading-4 text-white/75">
                {role === 'admin' ? 'Akumulasi pembayaran lunas' : 'Rekam medis tersimpan'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <TrendCard
        value={totalVisits}
        title="Total Kunjungan"
        icon={Stethoscope}
        data={visitTrend}
        color="#ff9f40"
        legend="Total Kunjungan"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <TrendCard
          value={totalNewPatients}
          title="Total Pasien Baru"
          icon={UserRoundPlus}
          data={newPatientTrend}
          color="#45b8a0"
          legend="Total Pasien Baru"
        />
        <TrendCard
          value={totalTreatments}
          title="Total Tindakan"
          icon={Bed}
          data={treatmentTrend}
          color="#ffcd56"
          legend="Total Tindakan"
        />
      </div>

      <motion.div {...chartMotion}>
        <Card className="overflow-hidden rounded-md border-slate-200 bg-white shadow-md dark:bg-slate-950">
          <PinkHeader value={stats?.totalPatients ?? 0} label="Total Pasien" icon={UserRound} />
          <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <DemographyPie title="Demografi Jenis Kelamin Pasien" data={demographics.gender} />
            <DemographyPie title="Demografi Umur Pasien" data={demographics.age} />
            <DemographyPie title="Demografi Pekerjaan Pasien" data={demographics.occupation} />
            <DemographyPie title="Demografi Kecamatan Pasien" data={demographics.district} />
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jadwal hari ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {today.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada jadwal.</p>
            )}
            {today.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{a.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{a.doctor_name}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">#{a.queue_number}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(a.appointment_date)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((item, idx) => (
              <div
                key={`${item.type}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize">{item.type.replace('_', ' ')}</span>
                <span className="max-w-full truncate text-right text-muted-foreground sm:max-w-[60%]">
                  {item.title}
                </span>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
