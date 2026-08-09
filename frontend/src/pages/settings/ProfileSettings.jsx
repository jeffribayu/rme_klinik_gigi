import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Eye, EyeOff, Loader2, Pencil, RefreshCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { averageDescriptors, descriptorFromVideo } from '@/lib/faceDescriptor';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || String(v).trim() === '' || String(v).trim().length >= 8, {
      message: 'Telepon minimal 8 digit atau kosongkan',
    }),
  motto: z.string().max(500, 'Maksimal 500 karakter').optional(),
  specialist: z.string().optional(),
  sip_number: z.string().optional(),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password lama wajib diisi'),
    password: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirmPassword: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi password baru tidak sama',
    path: ['confirmPassword'],
  });

function patchProfileFormData(values, photoFile) {
  const fd = new FormData();
  fd.append('name', values.name.trim());
  fd.append('email', values.email.trim());
  fd.append('phone', values.phone?.trim() ?? '');
  fd.append('motto', values.motto?.trim() ?? '');
  fd.append('specialist', values.specialist?.trim() ?? '');
  fd.append('sip_number', values.sip_number?.trim() ?? '');
  if (photoFile) fd.append('photo', photoFile);
  return fd;
}

async function patchMultipart(fd) {
  return api({
    method: 'patch',
    url: '/api/v1/auth/me',
    data: fd,
    transformRequest: [
      (data, headers) => {
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
          if (headers?.delete) headers.delete('Content-Type');
          else if (headers) delete headers['Content-Type'];
        }
        return data;
      },
    ],
  });
}

function ViewRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/40 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right sm:text-right">{value || '—'}</span>
    </div>
  );
}

const FACE_STEPS = [
  'Menghadap lurus ke kamera - sampel 1',
  'Menghadap lurus ke kamera - sampel 2',
  'Menghadap lurus ke kamera - sampel 3',
];

export default function ProfileSettings() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const storeUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [meRole, setMeRole] = useState('');
  /** Snapshot untuk mode baca & reset form (selalu sinkron setelah load/simpan). */
  const [snapshot, setSnapshot] = useState(null);
  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const faceRafRef = useRef(null);
  const faceStreamRef = useRef(null);
  const [faceCameraReady, setFaceCameraReady] = useState(false);
  const [faceSamples, setFaceSamples] = useState([]);
  const [faceSaving, setFaceSaving] = useState(false);
  const [faceMessage, setFaceMessage] = useState('Klik Buka kamera untuk mulai registrasi wajah.');
  const [faceDevices, setFaceDevices] = useState([]);
  const [selectedFaceDeviceId, setSelectedFaceDeviceId] = useState('');
  const [faceCameraDebug, setFaceCameraDebug] = useState('');
  const [faceCameraVisible, setFaceCameraVisible] = useState(false);
  const [facePanelOpen, setFacePanelOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      motto: '',
      specialist: '',
      sip_number: '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      password: '',
      confirmPassword: '',
    },
  });

  const applyUserToForm = (u) => {
    form.reset({
      name: u.name ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      motto: u.motto ?? '',
      specialist: u.doctor_specialist ?? '',
      sip_number: u.doctor_sip_number ?? '',
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/v1/auth/me');
        if (cancelled || !data.data) return;
        const u = data.data;
        setSnapshot(u);
        setMeRole(u.role || '');
        applyUserToForm(u);
      } catch {
        /* 401 handled globally */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form]);

  const openEdit = () => {
    if (snapshot) applyUserToForm(snapshot);
    setPhotoFile(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (snapshot) applyUserToForm(snapshot);
    setPhotoFile(null);
    setEditing(false);
  };

  const onSubmit = async (values) => {
    try {
      let res;
      if (meRole === 'doctor') {
        const fd = patchProfileFormData(values, photoFile);
        res = await patchMultipart(fd);
      } else {
        res = await api.patch('/api/v1/auth/me', {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone?.trim() ? values.phone.trim() : null,
          motto: values.motto?.trim() ? values.motto.trim() : null,
          specialist: null,
          sip_number: null,
        });
      }

      const payload = res.data;
      if (payload.token) {
        setAuth(payload.token, payload.data);
      } else {
        setUser(payload.data);
      }
      const u = payload.data;
      setSnapshot(u);
      setMeRole(u.role || meRole);
      applyUserToForm(u);
      setPhotoFile(null);
      setEditing(false);
      toast.success('Profil disimpan');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan profil');
    }
  };

  const displayUser = snapshot || storeUser;
  const canRegisterFace = meRole === 'doctor' || meRole === 'nurse';
  const faceRegisteredAt = snapshot?.doctor_face_registered_at || snapshot?.face_registered_at;

  const stopFaceCamera = useCallback(() => {
    if (faceRafRef.current) {
      window.cancelAnimationFrame(faceRafRef.current);
      faceRafRef.current = null;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
    setFaceCameraReady(false);
    setFaceCameraDebug('');
    setFaceCameraVisible(false);
  }, []);

  const loadFaceDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      setFaceDevices(cameras);
      return cameras;
    } catch {
      return [];
    }
  }, []);

  const drawFacePreview = useCallback(() => {
    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;
    if (!video || !canvas || !faceStreamRef.current) return;

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
      setFaceCameraReady(true);
      setFaceMessage('Kamera siap. Ikuti instruksi posisi wajah.');
      setFaceCameraDebug(`${width}x${height}`);
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);
      setFaceCameraDebug(`readyState ${video.readyState}, frame ${video.videoWidth || 0}x${video.videoHeight || 0}`);
    }

    faceRafRef.current = window.requestAnimationFrame(drawFacePreview);
  }, []);

  const startFaceCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Browser tidak mendukung kamera realtime');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      toast.error('Kamera membutuhkan HTTPS atau localhost');
      setFaceMessage('Kamera browser membutuhkan HTTPS atau localhost.');
      return;
    }

    setFaceMessage('Membuka kamera...');
    setFaceCameraVisible(true);
    try {
      stopFaceCamera();
      setFaceCameraVisible(true);
      await loadFaceDevices();
      const candidates = [
        ...(selectedFaceDeviceId
          ? [{ video: { deviceId: { exact: selectedFaceDeviceId }, width: { ideal: 720 }, height: { ideal: 720 } }, audio: false }]
          : []),
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

      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.muted = true;
        faceVideoRef.current.setAttribute('playsinline', 'true');
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
      }
      const [track] = stream.getVideoTracks();
      const settings = track?.getSettings?.() || {};
      if (settings.deviceId) setSelectedFaceDeviceId(settings.deviceId);
      setFaceCameraDebug(
        track
          ? `${track.label || 'Kamera'} ${settings.width || '?'}x${settings.height || '?'}`
          : ''
      );
      await loadFaceDevices();
      setFaceCameraReady(false);
      setFaceMessage('Menunggu gambar kamera muncul...');
      drawFacePreview();
    } catch (err) {
      stopFaceCamera();
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isBusy = err?.name === 'NotReadableError' || err?.name === 'TrackStartError';
      const message = isDenied
        ? 'Izin kamera ditolak. Izinkan kamera pada browser lalu klik Buka kamera lagi.'
        : isBusy
          ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi/tab lain yang memakai kamera lalu coba lagi.'
          : 'Kamera tidak tersedia. Pastikan perangkat punya kamera dan tidak sedang dipakai aplikasi lain.';
      setFaceMessage(message);
      setFaceCameraDebug(err?.name || '');
      toast.error(message);
    }
  }, [drawFacePreview, loadFaceDevices, selectedFaceDeviceId, stopFaceCamera]);

  const markFaceVideoReady = () => {
    const video = faceVideoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;
    setFaceCameraReady(true);
    setFaceMessage('Kamera siap. Ikuti instruksi posisi wajah.');
    setFaceCameraDebug(`${video.videoWidth}x${video.videoHeight}`);
  };

  const onPasswordSubmit = async (values) => {
    try {
      await api.patch('/api/v1/auth/me/password', values);
      passwordForm.reset();
      setSecurityOpen(false);
      toast.success('Password berhasil diganti');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengganti password');
    }
  };

  useEffect(() => () => stopFaceCamera(), [stopFaceCamera]);

  const captureFaceSample = () => {
    try {
      const { descriptor, quality } = descriptorFromVideo(faceVideoRef.current);
      if (!quality.ok) {
        toast.error('Pencahayaan/kontras belum cukup. Posisikan wajah lebih jelas.');
        return;
      }
      setFaceSamples((samples) => [...samples, descriptor].slice(0, FACE_STEPS.length));
      toast.success('Sampel wajah tersimpan');
    } catch (e) {
      toast.error(e.message || 'Gagal mengambil sampel wajah');
    }
  };

  const resetFaceSamples = () => {
    setFaceSamples([]);
    setFaceMessage('Ulangi pengambilan 3 posisi wajah.');
  };

  const saveFaceRegistration = async () => {
    if (faceSamples.length < FACE_STEPS.length) {
      toast.error('Lengkapi 3 sampel wajah terlebih dahulu');
      return;
    }
    setFaceSaving(true);
    try {
      const descriptor = averageDescriptors(faceSamples);
      const { data } = await api.patch('/api/v1/auth/me/face', { descriptor });
      setUser(data.data);
      setSnapshot(data.data);
      toast.success('Registrasi wajah berhasil');
      setFaceSamples([]);
      stopFaceCamera();
      setFacePanelOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan registrasi wajah');
    } finally {
      setFaceSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profil</CardTitle>
        <p className="text-sm text-muted-foreground">
          {editing
            ? 'Ubah data di bawah, lalu simpan.'
            : 'Lihat ringkasan profil Anda. Gunakan Edit profil untuk mengubah.'}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            <div className="flex shrink-0 flex-col items-center lg:w-48">
              <UserAvatar user={displayUser} className="h-28 w-28 text-2xl" />
              <p className="mt-4 max-w-[220px] text-center text-sm leading-relaxed text-muted-foreground">
                {snapshot?.motto?.trim() ? (
                  <span className="italic text-foreground/90">“{snapshot.motto.trim()}”</span>
                ) : (
                  <span className="text-muted-foreground/80">Belum ada moto</span>
                )}
              </p>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              {!editing ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Peran</span>
                      <Badge className="capitalize">{meRole || '—'}</Badge>
                    </div>
                    <Button type="button" onClick={openEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit profil
                    </Button>
                  </div>

                  <ViewRow label="Nama lengkap" value={snapshot?.name} />
                  <ViewRow label="Email (login)" value={snapshot?.email} />
                  <ViewRow label="Nomor telepon" value={snapshot?.phone} />

                  {canRegisterFace && (
                    <>
                      {meRole === 'doctor' && (
                        <>
                          <ViewRow label="Spesialis" value={snapshot?.doctor_specialist} />
                          <ViewRow label="Nomor SIP" value={snapshot?.doctor_sip_number} />
                        </>
                      )}
                      <ViewRow
                        label="Registrasi wajah"
                        value={
                          faceRegisteredAt
                            ? `Terdaftar (${new Date(faceRegisteredAt).toLocaleString('id-ID')})`
                            : 'Belum terdaftar'
                        }
                      />
                    </>
                  )}

                  {meRole === 'doctor' && (
                    <div className="flex flex-wrap gap-2 pt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/absensi">Absensi</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/gaji-dokter">Gaji dokter</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/obat">Obat / resep</Link>
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground pt-2">
                    Admin dapat mengelola daftar pengguna dan data dokter klinik di menu Pengaturan
                    lain sesuai hak akses.
                  </p>
                </>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Peran</span>
                    <Badge className="capitalize">{meRole || '—'}</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prof-name">Nama lengkap</Label>
                    <Input id="prof-name" {...form.register('name')} autoComplete="name" />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prof-email">Email (login)</Label>
                    <Input
                      id="prof-email"
                      type="email"
                      {...form.register('email')}
                      autoComplete="email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prof-phone">Nomor telepon</Label>
                    <Input
                      id="prof-phone"
                      type="tel"
                      {...form.register('phone')}
                      autoComplete="tel"
                      placeholder="Kosongkan jika tidak dipakai"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prof-motto">Moto / kutipan singkat</Label>
                    <Textarea
                      id="prof-motto"
                      rows={3}
                      {...form.register('motto')}
                      placeholder="Tampil di bawah foto profil (maks. 500 karakter)"
                      className="resize-y min-h-[72px]"
                    />
                    {form.formState.errors.motto && (
                      <p className="text-xs text-destructive">{form.formState.errors.motto.message}</p>
                    )}
                  </div>

                  {meRole === 'doctor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="prof-spec">Spesialis</Label>
                        <Input id="prof-spec" {...form.register('specialist')} placeholder="Opsional" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prof-sip">Nomor SIP</Label>
                        <Input id="prof-sip" {...form.register('sip_number')} placeholder="Opsional" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prof-photo">Foto profil (menu &amp; RME)</Label>
                        <Input
                          id="prof-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maks. 2 MB. Unggah langsung di sini.
                          {photoFile && (
                            <span className="ml-1 font-medium text-foreground">
                              File dipilih: {photoFile.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan…
                        </>
                      ) : (
                        'Simpan perubahan'
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Batal
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {!loading && canRegisterFace && (
          <div className="mt-8 rounded-xl border border-border/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Registrasi Wajah Absensi
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola data wajah untuk absensi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={faceRegisteredAt ? 'success' : 'secondary'}>
                  {faceRegisteredAt ? 'Terdaftar' : 'Belum terdaftar'}
                </Badge>
                <Button
                  type="button"
                  variant={facePanelOpen ? 'secondary' : 'outline'}
                  onClick={() => {
                    if (facePanelOpen) stopFaceCamera();
                    setFacePanelOpen((open) => !open);
                  }}
                >
                  {facePanelOpen ? 'Tutup Registrasi' : 'Registrasi Wajah'}
                </Button>
              </div>
            </div>

            {facePanelOpen && (
              <div className={`mt-5 grid gap-4 ${faceCameraVisible ? 'lg:grid-cols-[280px_1fr]' : ''}`}>
              {faceCameraVisible && (
                <div className="relative overflow-hidden rounded-lg border bg-slate-950">
                  <video
                    ref={faceVideoRef}
                    className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={markFaceVideoReady}
                    onCanPlay={markFaceVideoReady}
                  />
                  <canvas ref={faceCanvasRef} className="pointer-events-none h-72 w-full object-cover opacity-0" />
                  {!faceCameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center text-white">
                      <Camera className="h-10 w-10 opacity-80" />
                      <p className="text-sm font-medium">{faceMessage}</p>
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-36 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]" />
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-medium">Instruksi saat ini</p>
                  <p className="mt-1 text-lg">{FACE_STEPS[faceSamples.length] || 'Semua sampel sudah lengkap'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sampel tersimpan: {faceSamples.length}/{FACE_STEPS.length}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {faceDevices.length > 1 && (
                    <select
                      value={selectedFaceDeviceId}
                      onChange={(e) => setSelectedFaceDeviceId(e.target.value)}
                      className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {faceDevices.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {device.label || `Kamera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button type="button" variant="outline" className="gap-2" onClick={startFaceCamera}>
                    <Camera className="h-4 w-4" />
                    Buka kamera
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={!faceCameraReady || faceSamples.length >= FACE_STEPS.length}
                    onClick={captureFaceSample}
                  >
                    <Camera className="h-4 w-4" />
                    Ambil sampel
                  </Button>
                  <Button type="button" variant="ghost" className="gap-2" onClick={resetFaceSamples}>
                    <RefreshCcw className="h-4 w-4" />
                    Ulangi
                  </Button>
                </div>
                <Button
                  type="button"
                  disabled={faceSaving || faceSamples.length < FACE_STEPS.length}
                  onClick={saveFaceRegistration}
                >
                  {faceSaving ? 'Menyimpan...' : 'Simpan registrasi wajah'}
                </Button>
                {faceCameraDebug && (
                  <p className="text-xs text-muted-foreground">Status kamera: {faceCameraDebug}</p>
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {!loading && (
          <div className="mt-8 rounded-xl border border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Keamanan
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola password akun Anda.
                </p>
              </div>
              <Button
                type="button"
                variant={securityOpen ? 'secondary' : 'outline'}
                onClick={() => setSecurityOpen((open) => !open)}
              >
                {securityOpen ? 'Tutup Keamanan' : 'Ubah Password'}
              </Button>
            </div>

            {securityOpen && (
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="mt-5 grid max-w-lg gap-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="current-password">Password Lama</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="pr-10"
                      {...passwordForm.register('currentPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      aria-label={
                        showCurrentPassword ? 'Sembunyikan password lama' : 'Tampilkan password lama'
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="pr-10"
                        {...passwordForm.register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        onClick={() => setShowNewPassword((v) => !v)}
                        aria-label={
                          showNewPassword ? 'Sembunyikan password baru' : 'Tampilkan password baru'
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="pr-10"
                        {...passwordForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword
                            ? 'Sembunyikan konfirmasi password baru'
                            : 'Tampilkan konfirmasi password baru'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      passwordForm.reset();
                      setSecurityOpen(false);
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
