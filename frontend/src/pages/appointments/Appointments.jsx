import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Megaphone, MessageCircle, Plus, Stethoscope, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ageFromBirthDate, todayLocalDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const statusLabels = {
  menunggu: 'Belum Periksa',
  proses: 'Sudah Periksa',
  selesai: 'Selesai',
  batal: 'Batal',
};

function todayIso() {
  return todayLocalDate();
}

function formatLongDate(date) {
  if (!date) return '-';
  return parseAppointmentDate(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseAppointmentDate(value) {
  if (value instanceof Date) return value;
  const text = String(value || '');
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    );
  }
  return new Date(value);
}

function formatClock(value) {
  if (!value) return '--:--';
  const date = parseAppointmentDate(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 16) || '--:--';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function addMinutes(value, minutes) {
  const date = parseAppointmentDate(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  date.setMinutes(date.getMinutes() + minutes);
  return formatClock(date);
}

function appointmentDatePart(value, fallbackDate) {
  const text = String(value || '');
  return text.slice(0, 10) || fallbackDate;
}

function appointmentTimePart(value) {
  const text = String(value || '');
  const match = text.match(/[ T](\d{2}:\d{2})/);
  return match?.[1] || '09:00';
}

function combineAppointmentDateTime(date, time) {
  return `${date || todayIso()}T${time || '09:00'}`;
}

function whatsappUrl(phone, name) {
  if (!phone) return '';
  const normalized = String(phone).replace(/[^\d]/g, '').replace(/^0/, '62');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(
    `Halo ${name || 'Bapak/Ibu'}, kami dari klinik gigi mengingatkan jadwal pemeriksaan Anda.`
  )}`;
}

function statusTone(status) {
  if (status === 'proses' || status === 'selesai') return 'border-transparent bg-emerald-600 text-white hover:bg-emerald-700';
  if (status === 'batal') return 'border-transparent bg-slate-600 text-white hover:bg-slate-700';
  return 'border-transparent bg-red-600 text-white hover:bg-red-700';
}

export default function Appointments() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'doctor' || role === 'nurse';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const presetPatient = params.get('patient_id') || '';

  const [date, setDate] = useState(() => params.get('date') || todayIso());
  const [tab, setTab] = useState('menunggu');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('semua');
  const [patientSearch, setPatientSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest');
  const [pageSize, setPageSize] = useState('5');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [dialogPatientSearch, setDialogPatientSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    patient_id: presetPatient,
    doctor_id: '',
    appointment_date: `${date}T09:00`,
    status: 'menunggu',
  });

  const load = async (targetDate = date) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (targetDate) query.set('date', targetDate);
      if (statusFilter !== 'all') query.set('status', statusFilter);
      const { data } = await api.get(`/api/v1/appointments?${query}`);
      setList(data.data || []);
    } catch {
      toast.error('Gagal memuat antrian pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date, statusFilter]);

  useEffect(() => {
    if (presetPatient && canWrite) {
      setOpen(true);
      setForm((f) => ({ ...f, patient_id: presetPatient }));
    }
  }, [presetPatient, canWrite]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [p, d] = await Promise.all([
          api.get('/api/v1/patients?limit=100&page=1'),
          api.get('/api/v1/doctors'),
        ]);
        let loadedPatients = p.data.data || [];
        if (presetPatient && !loadedPatients.some((patient) => String(patient.id) === presetPatient)) {
          const selected = await api.get(`/api/v1/patients/${presetPatient}`);
          loadedPatients = [selected.data.data, ...loadedPatients];
        }
        setPatients(loadedPatients);
        setDoctors(d.data.data || []);
        setForm((f) => ({
          ...f,
          patient_id: presetPatient || f.patient_id,
          appointment_date: f.appointment_date || `${date}T09:00`,
          doctor_id: f.doctor_id || (d.data.data[0]?.id ? String(d.data.data[0].id) : ''),
        }));
      } catch {
        toast.error('Gagal memuat referensi pasien dan dokter');
      }
    })();
  }, [open, date, presetPatient]);

  const counts = useMemo(
    () => ({
      menunggu: list.filter((a) => a.status === 'menunggu').length,
      diperiksa: list.filter((a) => a.status === 'proses' || a.status === 'selesai').length,
      semua: list.length,
    }),
    [list]
  );

  const visibleList = useMemo(() => {
    const filtered = list.filter((a) => {
      const tabMatch =
        tab === 'semua' ||
        (tab === 'sudah' ? a.status === 'proses' || a.status === 'selesai' : a.status === 'menunggu');
      const nameMatch = String(a.patient_name || '')
        .toLowerCase()
        .includes(patientSearch.trim().toLowerCase());
      const codeMatch = String(a.patient_code || '')
        .toLowerCase()
        .includes(codeSearch.trim().toLowerCase());
      return tabMatch && nameMatch && codeMatch;
    });

    filtered.sort((a, b) => {
      const av = parseAppointmentDate(a.appointment_date).getTime();
      const bv = parseAppointmentDate(b.appointment_date).getTime();
      return sortOrder === 'oldest' ? av - bv : bv - av;
    });

    return filtered.slice(0, Number(pageSize));
  }, [list, tab, patientSearch, codeSearch, sortOrder, pageSize]);

  const selectablePatients = useMemo(() => {
    const q = dialogPatientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.patient_code, p.name, p.phone, p.nik]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [patients, dialogPatientSearch]);

  const closeDialog = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen && presetPatient) {
      params.delete('patient_id');
      setParams(params, { replace: true });
    }
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (!form.patient_id || !form.doctor_id || !form.appointment_date) {
      toast.error('Pasien, dokter, dan waktu wajib diisi');
      return;
    }

    const appointmentDate = form.appointment_date.slice(0, 10);

    try {
      setSaving(true);
      await api.post('/api/v1/appointments', {
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        appointment_date: form.appointment_date.replace('T', ' ').slice(0, 19),
        status: form.status,
      });
      toast.success('Pasien masuk antrian');
      closeDialog(false);
      setDate(appointmentDate);
      setTab('menunggu');
      await load(appointmentDate);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan jadwal');
    } finally {
      setSaving(false);
    }
  };

  const markInRoom = async (appointment) => {
    try {
      await api.patch(`/api/v1/appointments/${appointment.id}/status`, {
        status: 'proses',
      });
      toast.success('Status antrian diperbarui');
      navigate(
        `/medical-records/new?patient_id=${appointment.patient_id}&doctor_id=${appointment.doctor_id}&appointment_id=${appointment.id}&queue_number=${appointment.queue_number}`
      );
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memperbarui status');
    }
  };

  const deleteAppointment = async (appointment) => {
    if (!window.confirm(`Hapus antrian pasien "${appointment.patient_name}"?`)) return;
    try {
      await api.delete(`/api/v1/appointments/${appointment.id}`);
      toast.success('Antrian pasien dihapus');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus antrian pasien');
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('semua');
    setPatientSearch('');
    setCodeSearch('');
    setSortOrder('oldest');
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="rounded border-slate-200 bg-white shadow-md shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-medium uppercase tracking-normal text-slate-900 dark:text-slate-50 sm:text-3xl">
                  ANTRIAN PASIEN
                </h1>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <CalendarDays className="h-4 w-4" />
                  {formatLongDate(date)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="h-9 rounded bg-emerald-500 px-3 shadow-none hover:bg-emerald-600"
                  onClick={() => toast.info('Pengumuman antrian belum tersedia.')}
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  Pengumuman Antrian
                </Button>
                {canWrite && (
                  <Button
                    type="button"
                    className="h-9 rounded bg-blue-600 px-3 shadow-none hover:bg-blue-700"
                    onClick={() => {
                      setForm((f) => ({ ...f, patient_id: '', appointment_date: `${date}T09:00` }));
                      setDialogPatientSearch('');
                      setOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Jadwalkan Pasien
                  </Button>
                )}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setTab('menunggu')}
                    className={`rounded px-4 py-2 text-sm font-bold ${
                      tab === 'menunggu' ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Belum Periksa <span className="rounded border border-red-400 px-1 text-xs">{counts.menunggu}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('sudah')}
                    className={`rounded px-4 py-2 text-sm font-bold ${
                      tab === 'sudah' ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Sudah Periksa <span className="rounded border border-emerald-500 px-1 text-xs">{counts.diperiksa}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('semua')}
                    className={`rounded px-4 py-2 text-sm font-bold ${
                      tab === 'semua' ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Semua <span className="rounded border border-slate-400 px-1 text-xs">{counts.semua}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span>Show</span>
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger className="h-9 w-[76px] rounded bg-white dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>entries</span>
                </div>
              </div>

              <div className="mt-3 space-y-4">
                {loading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded" />)
                ) : (
                  visibleList.map((a, idx) => {
                    const age = ageFromBirthDate(a.patient_birth_date);
                    const wa = whatsappUrl(a.patient_phone, a.patient_name);
                    const isWaiting = a.status === 'menunggu';

                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex flex-wrap items-center gap-1 bg-slate-200 px-5 py-2 dark:bg-slate-900">
                          <Badge className={`rounded px-2 py-0.5 text-xs ${statusTone(a.status)}`}>
                            {statusLabels[a.status] || a.status}
                          </Badge>
                          <Badge className="rounded border-transparent bg-slate-600 px-2 py-0.5 text-xs text-white hover:bg-slate-700">
                            {isWaiting ? 'Belum Diproses' : 'Diproses'}
                          </Badge>
                          <Badge className="rounded border-transparent bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">
                            Bayar Sendiri
                          </Badge>
                          <span className="ml-auto text-lg font-bold text-slate-800 dark:text-slate-100">
                            {formatClock(a.appointment_date)} - {addMinutes(a.appointment_date, 5)}
                          </span>
                          <Badge className="rounded bg-amber-400 px-2 py-0.5 text-xs text-amber-950 hover:bg-amber-400">
                            {isWaiting ? 'BOOKED' : 'IN ROOM'}
                          </Badge>
                        </div>
                        <div className="h-2 bg-red-500" />

                        <div className="grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_120px]">
                          <div>
                            <h2 className="text-2xl font-medium text-slate-900 dark:text-slate-50">
                              {a.patient_name}
                            </h2>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {age != null && (
                                <Badge className="mr-1 rounded border-transparent bg-slate-600 px-1.5 py-0 text-xs text-white hover:bg-slate-700">
                                  {age} thn
                                </Badge>
                              )}
                              {a.patient_gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </div>
                            <dl className="mt-2 space-y-1 text-sm">
                              <div>
                                <dt>No. Rekam Medis</dt>
                                <dd className="font-bold underline">{a.patient_code}</dd>
                              </div>
                              <div>
                                <dt>No. Rawat</dt>
                                <dd className="font-bold">
                                  {date.replaceAll('-', '/')}/{String(a.queue_number).padStart(4, '0')}
                                </dd>
                              </div>
                              <div>
                                <dt>No. Reg: {String(a.queue_number).padStart(4, '0')}</dt>
                                <dd>Rujukan:</dd>
                                <dd>-</dd>
                              </div>
                            </dl>
                          </div>

                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            <p>Dokter Penanggung Jawab:</p>
                            <p className="font-bold">{a.doctor_name}</p>
                            <p>Poli:</p>
                            <p className="font-bold">Poliklinik 1</p>
                            <p>Catatan:</p>
                            <p className="font-bold">SCALING</p>
                            <p>Riwayat Alergi:</p>
                            <p>{a.patient_blood_type ? `Gol. darah ${a.patient_blood_type}` : '-'}</p>
                          </div>

                          <div className="flex flex-col gap-2">
                            {wa ? (
                              <Button asChild className="h-9 rounded bg-cyan-600 font-bold text-white shadow-none hover:bg-cyan-700">
                                <a href={wa} target="_blank" rel="noreferrer">
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Kirim Pesan
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                className="h-9 rounded bg-cyan-600 font-bold text-white shadow-none hover:bg-cyan-700"
                                onClick={() => toast.info('Nomor HP pasien belum tersedia.')}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Kirim Pesan
                              </Button>
                            )}
                            <Button
                              type="button"
                              className="h-14 flex-col rounded bg-teal-600 font-bold text-white shadow-none hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-600"
                              onClick={() => markInRoom(a)}
                              disabled={!canWrite}
                            >
                              <Stethoscope className="h-5 w-5" />
                              periksa
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="h-9 rounded border-teal-300 bg-white font-bold text-teal-800 shadow-none hover:bg-teal-50 hover:text-teal-900 dark:border-teal-700 dark:bg-slate-950 dark:text-teal-200 dark:hover:bg-teal-950"
                            >
                              <Link to={`/medical-records/new?patient_id=${a.patient_id}`}>
                                Rekam Medis
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded border-red-200 bg-white font-bold text-red-700 shadow-none hover:bg-red-50 hover:text-red-800 disabled:border-slate-200 disabled:text-slate-400 dark:border-red-900 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950"
                              onClick={() => deleteAppointment(a)}
                              disabled={!canWrite}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {!loading && visibleList.length === 0 && (
                  <p className="rounded border border-dashed border-slate-300 px-6 py-12 text-center text-muted-foreground dark:border-slate-700">
                    Tidak ada antrian pasien pada filter ini.
                  </p>
                )}
              </div>
            </div>

            <aside className="space-y-5 text-sm">
              <div>
                <Label className="mb-2 block font-bold">Urutkan</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="h-10 rounded bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldest">Waktu terlama</SelectItem>
                    <SelectItem value="newest">Waktu terbaru</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block font-bold">Tanggal</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <Label className="mb-2 block font-bold">Status Bayar</Label>
                <div className="space-y-1">
                  {[
                    ['semua', 'Semua', 'bg-slate-500'],
                    ['sudah', 'Sudah Bayar', 'bg-emerald-500'],
                    ['piutang', 'Piutang', 'bg-amber-400 text-amber-950'],
                    ['belum', 'Belum Bayar', 'bg-red-500'],
                  ].map(([value, label, tone]) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={paymentFilter === value}
                        onChange={() => setPaymentFilter(value)}
                      />
                      <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${tone}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block font-bold">Status Antrian</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="menunggu">Belum Periksa</SelectItem>
                    <SelectItem value="proses">Proses</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                    <SelectItem value="batal">Batal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block font-bold">Nama Pasien</Label>
                <Input
                  placeholder="Nama Pasien"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="h-10 rounded bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <Label className="mb-2 block font-bold">No. Rekam Medis</Label>
                <Input
                  placeholder="No. Rekam Medis"
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  className="h-10 rounded bg-white dark:bg-slate-950"
                />
              </div>

              <Button type="button" className="rounded bg-slate-600 shadow-none hover:bg-slate-700" onClick={resetFilters}>
                Reset Filter
              </Button>
            </aside>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Jadwalkan pasien</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Pasien</Label>
              <Input
                value={dialogPatientSearch}
                onChange={(e) => setDialogPatientSearch(e.target.value)}
                placeholder="Cari nama / kode / NIK / telepon pasien"
                className="h-10 rounded bg-white dark:bg-slate-950"
                disabled={Boolean(presetPatient)}
              />
              <select
                value={form.patient_id}
                onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(presetPatient)}
                required
              >
                <option value="">Pilih pasien</option>
                {selectablePatients.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.patient_code} - {p.name}
                  </option>
                ))}
              </select>
              {!presetPatient && selectablePatients.length === 0 && (
                <p className="text-xs text-muted-foreground">Pasien tidak ditemukan.</p>
              )}
              {presetPatient && (
                <p className="text-xs text-muted-foreground">
                  Pasien dipilih otomatis dari Data Pasien.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Dokter</Label>
              <select
                value={form.doctor_id}
                onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Pilih dokter</option>
                {doctors.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Waktu Booking</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="booking-date" className="text-xs text-muted-foreground">
                    Tanggal
                  </Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={appointmentDatePart(form.appointment_date, date)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        appointment_date: combineAppointmentDateTime(
                          e.target.value,
                          appointmentTimePart(f.appointment_date)
                        ),
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="booking-time" className="text-xs text-muted-foreground">
                    Jam Booking
                  </Label>
                  <Input
                    id="booking-time"
                    type="time"
                    value={appointmentTimePart(form.appointment_date)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        appointment_date: combineAppointmentDateTime(
                          appointmentDatePart(f.appointment_date, date),
                          e.target.value
                        ),
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status awal</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="menunggu">Belum Periksa</option>
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
                <option value="batal">Batal</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving || patients.length === 0 || doctors.length === 0}>
                {saving ? 'Menyimpan...' : 'Simpan & Masuk Antrian'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
