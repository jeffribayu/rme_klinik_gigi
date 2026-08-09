import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, LogIn, LogOut, Pencil, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatAttendanceClock, publicAssetUrl, publicAssetUrlCandidates } from '@/lib/utils';
import { blobFromVideo, descriptorFromVideo } from '@/lib/faceDescriptor';

const STATUS_OPTS = [
  { v: 'hadir', l: 'Hadir' },
  { v: 'izin', l: 'Izin' },
  { v: 'sakit', l: 'Sakit' },
  { v: 'cuti', l: 'Cuti' },
  { v: 'alfa', l: 'Tanpa keterangan' },
];

const SHIFT_LABELS = {
  shift1: 'Shift 1 (09:00-15:00)',
  shift2: 'Shift 2 (15:00-21:00)',
};

function shiftLabel(shift) {
  return SHIFT_LABELS[shift] || SHIFT_LABELS.shift1;
}

function isLateNote(note) {
  return String(note || '').trim().toLowerCase().startsWith('terlambat');
}

function attendanceNote(row) {
  return row?.late_note || row?.note || '';
}

function attendanceStatusClass(row) {
  if (row?.status === 'hadir' && !isLateNote(attendanceNote(row))) {
    return 'font-semibold text-green-600 dark:text-green-400';
  }
  if (isLateNote(attendanceNote(row))) {
    return 'font-semibold text-red-600 dark:text-red-400';
  }
  return 'text-muted-foreground';
}

function monthNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function workDateToYmd(wd) {
  if (!wd) return '';
  const s = typeof wd === 'string' ? wd : String(wd);
  return s.slice(0, 10);
}

function workDateToMonth(wd) {
  const ymd = workDateToYmd(wd);
  return ymd.length >= 7 ? ymd.slice(0, 7) : null;
}

function AttendancePhoto({ path, alt }) {
  const urls = publicAssetUrlCandidates(path);
  const [index, setIndex] = useState(0);

  if (!urls.length) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-background text-[10px] text-muted-foreground">
        Belum ada
      </div>
    );
  }

  return (
    <img
      src={urls[index]}
      alt={alt}
      className="h-16 w-16 rounded-md border object-cover"
      onError={() => setIndex((current) => Math.min(current + 1, urls.length - 1))}
    />
  );
}

export default function AttendancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManageAttendance = role === 'admin';
  const canScanFaceAttendance = role === 'doctor' || role === 'nurse';
  const [month, setMonth] = useState(monthNow);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [adminStaffType, setAdminStaffType] = useState('all');
  const [adminDoctorFilter, setAdminDoctorFilter] = useState('all');
  const [adminNurseFilter, setAdminNurseFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRafRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlRef = useRef('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraMessage, setCameraMessage] = useState('Klik Buka kamera untuk mulai scan wajah.');
  const [scanPreview, setScanPreview] = useState('');
  const [scanQuality, setScanQuality] = useState(null);
  const [scanSaving, setScanSaving] = useState(false);
  const [scanShift, setScanShift] = useState('shift1');

  const [adminForm, setAdminForm] = useState({
    doctor_id: '',
    work_date: new Date().toISOString().slice(0, 10),
    shift: 'shift1',
    status: 'hadir',
    check_in: '08:00',
    check_out: '16:00',
    note: '',
  });

  useEffect(() => {
    if (!canManageAttendance) return;
    (async () => {
      try {
        const [doctorRes, nurseRes] = await Promise.all([
          api.get('/api/v1/doctors'),
          api.get('/api/v1/users/nurses'),
        ]);
        setDoctors(doctorRes.data.data || []);
        setNurses(nurseRes.data.data || []);
      } catch {
        toast.error('Gagal memuat data dokter/perawat');
      }
    })();
  }, [canManageAttendance]);

  useEffect(() => {
    if (!canManageAttendance || !doctors.length) return;
    setAdminForm((f) => (f.doctor_id ? f : { ...f, doctor_id: String(doctors[0].id) }));
  }, [canManageAttendance, doctors]);

  const load = useCallback(
    async (explicitMonth) => {
      setLoading(true);
      const m = (explicitMonth ?? month).slice(0, 7);
      try {
        const params = new URLSearchParams({ month: m });
        if (canManageAttendance && adminStaffType !== 'all') {
          params.set('type', adminStaffType);
        }
        if (canManageAttendance && adminStaffType !== 'nurse' && adminDoctorFilter !== 'all') {
          params.set('doctor_id', adminDoctorFilter);
        }
        if (canManageAttendance && adminStaffType !== 'doctor' && adminNurseFilter !== 'all') {
          params.set('nurse_id', adminNurseFilter);
        }
        const { data } = await api.get(`/api/v1/attendance?${params}`);
        setRows(data.data || []);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Gagal memuat absensi');
      } finally {
        setLoading(false);
      }
    },
    [month, adminStaffType, adminDoctorFilter, adminNurseFilter, role, canManageAttendance]
  );

  useEffect(() => {
    load();
  }, [load]);

  const clearScan = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setScanPreview('');
    setScanQuality(null);
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraRafRef.current) {
      window.cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const drawCameraPreview = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
      setCameraReady(true);
      setCameraStatus('ready');
      setCameraMessage('Kamera siap. Posisikan wajah di dalam oval lalu klik Scan wajah.');
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);
    }

    cameraRafRef.current = window.requestAnimationFrame(drawCameraPreview);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraMessage('Browser tidak mendukung kamera realtime.');
      toast.error('Browser tidak mendukung kamera realtime');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraStatus('error');
      setCameraMessage('Kamera browser membutuhkan HTTPS atau localhost.');
      toast.error('Kamera membutuhkan HTTPS atau localhost');
      return;
    }

    setCameraStatus('opening');
    setCameraMessage('Membuka kamera...');
    clearScan();
    try {
      stopCamera();
      const candidates = [
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];
      let stream;
      let lastError;
      for (const constraints of candidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!stream) throw lastError || new Error('Kamera tidak tersedia');

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(false);
      setCameraStatus('opening');
      setCameraMessage('Menunggu gambar kamera muncul...');
      drawCameraPreview();
    } catch (err) {
      stopCamera();
      setCameraStatus('error');
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const message = isDenied
        ? 'Izin kamera ditolak. Izinkan kamera pada browser lalu klik Buka kamera lagi.'
        : 'Kamera tidak tersedia. Pastikan perangkat punya kamera dan tidak sedang dipakai aplikasi lain.';
      setCameraMessage(message);
      toast.error(message);
    }
  }, [clearScan, drawCameraPreview, stopCamera]);

  useEffect(() => {
    if (!canScanFaceAttendance) return undefined;
    return () => {
      stopCamera();
      clearScan();
    };
  }, [canScanFaceAttendance, startCamera, stopCamera, clearScan]);

  const readLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS/geolocation tidak tersedia di browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

  const submitFaceScan = async (mode) => {
    const video = videoRef.current;
    if (!video || !cameraReady) {
      toast.error('Kamera belum siap');
      return;
    }
    setScanSaving(true);
    try {
      const { descriptor, quality } = descriptorFromVideo(video);
      setScanQuality(quality);
      if (!quality.ok) {
        toast.error('Wajah belum cukup jelas. Perbaiki cahaya dan posisi wajah.');
        return;
      }

      const [photo, position] = await Promise.all([blobFromVideo(video), readLocation()]);
      clearScan();
      const previewUrl = URL.createObjectURL(photo);
      previewUrlRef.current = previewUrl;
      setScanPreview(previewUrl);

      const fd = new FormData();
      fd.append('mode', mode);
      fd.append('shift', scanShift);
      fd.append('descriptor', JSON.stringify(descriptor));
      fd.append('lat', String(position.coords.latitude));
      fd.append('lng', String(position.coords.longitude));
      fd.append('accuracy', String(position.coords.accuracy || ''));
      fd.append('photo', photo, `face-scan-${mode}-${Date.now()}.jpg`);

      const res = await api.post('/api/v1/attendance/face', fd);
      const row = res.data?.data;
      const clock = res.data?.recorded_at ? String(res.data.recorded_at).slice(0, 5) : null;
      const label = mode === 'in' ? 'Masuk' : 'Pulang';
      const sim = res.data?.similarity ? ` Similarity ${res.data.similarity}` : '';
      const shiftText = res.data?.shift ? ` ${shiftLabel(res.data.shift)}.` : '';
      const distance = res.data?.distance_meters
        ? ` Jarak ${res.data.distance_meters} m dari klinik.`
        : '';
      toast.success(clock ? `Absen ${label} jam ${clock} WIB tercatat.${shiftText}${sim}${distance}` : `Absen ${label} tercatat.${shiftText}${sim}${distance}`);
      const ym = workDateToMonth(row?.work_date);
      if (ym) setMonth(ym);
      await load(ym || undefined);
    } catch (err) {
      let message = err.message;
      if (err.code === 1 || err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin lokasi ditolak. Aktifkan izin lokasi/GPS untuk absensi.';
      } else if (err.code === 2) {
        message = 'Lokasi GPS belum terbaca. Pastikan GPS aktif lalu coba lagi di area klinik.';
      } else if (err.code === 3) {
        message = 'Pembacaan lokasi terlalu lama. Coba ulangi di area terbuka atau dekat jendela.';
      }
      toast.error(err.response?.data?.message || message || 'Gagal melakukan scan wajah');
    } finally {
      setScanSaving(false);
    }
  };

  const saveAdminForm = async (e) => {
    e.preventDefault();
    if (!adminForm.doctor_id) {
      toast.error('Pilih dokter');
      return;
    }
    try {
      await api.put('/api/v1/attendance', {
        doctor_id: Number(adminForm.doctor_id),
        work_date: adminForm.work_date,
        shift: adminForm.shift,
        status: adminForm.status,
        check_in: adminForm.check_in || null,
        check_out: adminForm.check_out || null,
        note: adminForm.note || null,
      });
      toast.success('Absensi disimpan');
      const ym = workDateToMonth(adminForm.work_date);
      if (ym) setMonth(ym);
      load(ym || undefined);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const resetAdminForm = () => {
    setAdminForm({
      doctor_id: doctors[0]?.id ? String(doctors[0].id) : '',
      work_date: new Date().toISOString().slice(0, 10),
      shift: 'shift1',
      status: 'hadir',
      check_in: '08:00',
      check_out: '16:00',
      note: '',
    });
  };

  const startEditRow = (r) => {
    setAdminForm({
      doctor_id: String(r.doctor_id),
      work_date: workDateToYmd(r.work_date),
      shift: r.shift || 'shift1',
      status: r.status,
      check_in: r.check_in ? String(r.check_in).slice(0, 5) : '',
      check_out: r.check_out ? String(r.check_out).slice(0, 5) : '',
      note: r.note || r.late_note || '',
    });
    const ym = workDateToMonth(r.work_date);
    if (ym) setMonth(ym);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRow = async (row) => {
    if (!window.confirm('Hapus baris absensi ini?')) return;
    try {
      await api.delete(`/api/v1/attendance/${row.id}`, {
        params: { type: row.personnel_type },
      });
      toast.success('Absensi dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  const cameraVisible = cameraStatus !== 'idle' || Boolean(scanPreview);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Absensi</h1>
        <p className="text-muted-foreground">
          {canManageAttendance
            ? 'Admin mengelola absensi manual dokter dan melihat rekapan scan wajah dokter/perawat.'
            : 'Scan wajah dan lokasi klinik untuk mencatat jam masuk dan pulang.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Bulan ringkasan</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          {canManageAttendance && (
            <div className="min-w-[180px] space-y-2">
              <Label>Jenis staf</Label>
              <Select
                value={adminStaffType}
                onValueChange={(value) => {
                  setAdminStaffType(value);
                  setAdminDoctorFilter('all');
                  setAdminNurseFilter('all');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua staf</SelectItem>
                  <SelectItem value="doctor">Dokter</SelectItem>
                  <SelectItem value="nurse">Perawat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {canManageAttendance && adminStaffType !== 'nurse' && (
            <div className="min-w-[240px] space-y-2">
              <Label>Dokter</Label>
              <Select value={adminDoctorFilter} onValueChange={setAdminDoctorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Dokter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua dokter</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {canManageAttendance && adminStaffType !== 'doctor' && (
            <div className="min-w-[240px] space-y-2">
              <Label>Perawat</Label>
              <Select value={adminNurseFilter} onValueChange={setAdminNurseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Perawat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua perawat</SelectItem>
                  {nurses.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {canScanFaceAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Absensi scan wajah
            </CardTitle>
          </CardHeader>
          <CardContent className={`grid gap-4 ${cameraVisible ? 'lg:grid-cols-[260px_1fr]' : ''}`}>
            {cameraVisible && (
              <div className="relative overflow-hidden rounded-lg border border-border bg-slate-950">
                <video
                  ref={videoRef}
                  className="pointer-events-none absolute h-px w-px opacity-0"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className={`h-64 w-full object-cover ${scanPreview ? 'hidden' : 'block'}`} />
                {scanPreview ? (
                  <img src={scanPreview} alt="Preview scan wajah absensi" className="h-64 w-full object-cover" />
                ) : null}
                {!scanPreview && cameraStatus !== 'ready' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center text-white">
                    <Camera className="h-10 w-10 opacity-80" />
                    <p className="text-sm font-medium">
                      {cameraStatus === 'opening' ? 'Membuka kamera...' : cameraMessage}
                    </p>
                  </div>
                )}
                {!scanPreview && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]" />
                )}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scan wajah realtime</Label>
                <p className="text-xs text-muted-foreground">
                  Pastikan wajah berada di dalam oval dan perangkat berada maksimal 50 meter dari lokasi klinik. Sistem akan mencocokkan wajah dengan data yang didaftarkan di Profil dan meminta lokasi GPS.
                </p>
                {scanQuality && (
                  <p className="text-xs text-muted-foreground">
                    Kualitas: brightness {scanQuality.brightness}, kontras {scanQuality.contrast}
                  </p>
                )}
              </div>
              <div className="max-w-sm space-y-2">
                <Label>Shift absen</Label>
                <Select value={scanShift} onValueChange={setScanShift}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shift1">{SHIFT_LABELS.shift1}</SelectItem>
                    <SelectItem value="shift2">{SHIFT_LABELS.shift2}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" className="gap-2" onClick={startCamera}>
                  <Camera className="h-4 w-4" />
                  Buka kamera
                </Button>
                <Button type="button" variant="ghost" className="gap-2" onClick={clearScan}>
                  <RefreshCcw className="h-4 w-4" />
                  Scan ulang
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" className="gap-2" disabled={scanSaving || !cameraReady} onClick={() => submitFaceScan('in')}>
                  <LogIn className="h-4 w-4" />
                  Absensi masuk
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={scanSaving || !cameraReady}
                  onClick={() => submitFaceScan('out')}
                >
                  <LogOut className="h-4 w-4" />
                  Absensi pulang
                </Button>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Daftarkan wajah terlebih dahulu di menu Profil. Pilih shift sebelum absen. Shift 1 memiliki toleransi sampai 09:15 WIB, Shift 2 sampai 15:15 WIB.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageAttendance && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah / ubah absensi dokter</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAdminForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Dokter *</Label>
                <Select
                  value={adminForm.doctor_id || undefined}
                  onValueChange={(v) => setAdminForm((f) => ({ ...f, doctor_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dokter" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={adminForm.work_date}
                  onChange={(e) => setAdminForm((f) => ({ ...f, work_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={adminForm.status}
                  onValueChange={(v) => setAdminForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map((o) => (
                      <SelectItem key={o.v} value={o.v}>
                        {o.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select
                  value={adminForm.shift}
                  onValueChange={(v) => setAdminForm((f) => ({ ...f, shift: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shift1">{SHIFT_LABELS.shift1}</SelectItem>
                    <SelectItem value="shift2">{SHIFT_LABELS.shift2}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jam masuk</Label>
                <Input
                  type="time"
                  value={adminForm.check_in}
                  onChange={(e) => setAdminForm((f) => ({ ...f, check_in: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jam pulang</Label>
                <Input
                  type="time"
                  value={adminForm.check_out}
                  onChange={(e) => setAdminForm((f) => ({ ...f, check_out: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Catatan</Label>
                <Input
                  value={adminForm.note}
                  onChange={(e) => setAdminForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit">Simpan</Button>
                <Button type="button" variant="outline" onClick={resetAdminForm}>
                  Form baru
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan bulan {month}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data absensi bulan ini.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rows.map((r) => {
                const note = attendanceNote(r);
                return (
                <li key={`${r.personnel_type || 'doctor'}-${r.id}`} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {canManageAttendance && (
                        <>
                          <span className="font-medium text-foreground">{r.personnel_name || r.doctor_name}</span>
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {r.personnel_type === 'nurse' ? 'Perawat' : 'Dokter'}
                          </span>
                        </>
                      )}
                      <span className="font-medium">{formatDate(r.work_date)}</span>
                      <span className="font-medium text-foreground/80">{shiftLabel(r.shift)}</span>
                      <span className={`capitalize ${attendanceStatusClass(r)}`}>{r.status}</span>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="text-foreground/80">Masuk:</span> {formatAttendanceClock(r.check_in)}
                      <span className="mx-2">-</span>
                      <span className="text-foreground/80">Pulang:</span> {formatAttendanceClock(r.check_out)}
                      {r.check_in_photo && (
                        <>
                          <span className="mx-2">-</span>
                          <a href={publicAssetUrl(r.check_in_photo)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            Foto bukti masuk
                          </a>
                        </>
                      )}
                      {r.check_out_photo && (
                        <>
                          <span className="mx-2">-</span>
                          <a href={publicAssetUrl(r.check_out_photo)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            Foto bukti pulang
                          </a>
                        </>
                      )}
                      {canManageAttendance && (r.check_in_similarity || r.check_out_similarity) && (
                        <>
                          <span className="mx-2">-</span>
                          <span>
                            Similarity: {r.check_in_similarity || '-'} / {r.check_out_similarity || '-'}
                          </span>
                        </>
                      )}
                      {canManageAttendance && (r.check_in_lat || r.check_out_lat) && (
                        <>
                          <span className="mx-2">-</span>
                          <span>
                            Lokasi: {r.check_in_lat && r.check_in_lng ? `${r.check_in_lat}, ${r.check_in_lng}` : '-'}
                            {' / '}
                            {r.check_out_lat && r.check_out_lng ? `${r.check_out_lat}, ${r.check_out_lng}` : '-'}
                          </span>
                        </>
                      )}
                      {note ? (
                        <span
                          className={`ml-2 font-semibold ${
                            isLateNote(note) ? 'text-red-600 dark:text-red-400' : ''
                          }`}
                        >
                          {note}
                        </span>
                      ) : null}
                    </div>
                    {canManageAttendance && (
                      <div className="mt-3 grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Scan Masuk</p>
                          <div className="flex gap-3">
                            {r.check_in_photo ? (
                              <a href={publicAssetUrl(r.check_in_photo)} target="_blank" rel="noreferrer" className="block">
                                <AttendancePhoto path={r.check_in_photo} alt="Foto bukti masuk" />
                              </a>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-background text-[10px] text-muted-foreground">
                                Belum ada
                              </div>
                            )}
                            <div className="min-w-0 text-xs text-muted-foreground">
                              <p>Similarity: <span className="font-medium text-foreground">{r.check_in_similarity || '-'}</span></p>
                              <p>Koordinat: <span className="font-medium text-foreground">{r.check_in_lat && r.check_in_lng ? `${r.check_in_lat}, ${r.check_in_lng}` : '-'}</span></p>
                              <p>Jam: <span className="font-medium text-foreground">{formatAttendanceClock(r.check_in)}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Scan Pulang</p>
                          <div className="flex gap-3">
                            {r.check_out_photo ? (
                              <a href={publicAssetUrl(r.check_out_photo)} target="_blank" rel="noreferrer" className="block">
                                <AttendancePhoto path={r.check_out_photo} alt="Foto bukti pulang" />
                              </a>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-background text-[10px] text-muted-foreground">
                                Belum ada
                              </div>
                            )}
                            <div className="min-w-0 text-xs text-muted-foreground">
                              <p>Similarity: <span className="font-medium text-foreground">{r.check_out_similarity || '-'}</span></p>
                              <p>Koordinat: <span className="font-medium text-foreground">{r.check_out_lat && r.check_out_lng ? `${r.check_out_lat}, ${r.check_out_lng}` : '-'}</span></p>
                              <p>Jam: <span className="font-medium text-foreground">{formatAttendanceClock(r.check_out)}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {canManageAttendance && (
                    <div className="flex shrink-0 gap-1">
                      {r.personnel_type !== 'nurse' && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditRow(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteRow(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
