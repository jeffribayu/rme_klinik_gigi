import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const emptyForm = {
  name: '',
  specialist: '',
  sip_number: '',
  phone: '',
  user_id: '',
  photoFile: null,
};

function appendDoctorFormData(data) {
  const fd = new FormData();
  fd.append('name', data.name.trim());
  fd.append('specialist', data.specialist?.trim() || '');
  fd.append('sip_number', data.sip_number?.trim() || '');
  fd.append('phone', data.phone?.trim() || '');
  fd.append('user_id', data.user_id ? String(data.user_id) : '');
  if (data.photoFile) fd.append('photo', data.photoFile);
  return fd;
}

async function sendDoctorForm(method, path, fd) {
  return api({
    method,
    url: path,
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

export default function DoctorsSettings() {
  const [list, setList] = useState([]);
  const [dokterUsers, setDokterUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, uRes] = await Promise.all([
        api.get('/api/v1/doctors'),
        api.get('/api/v1/users', { params: { role: 'doctor' } }),
      ]);
      setList(dRes.data.data || []);
      setDokterUsers(uRes.data.data || []);
    } catch {
      toast.error('Gagal memuat data dokter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      specialist: row.specialist || '',
      sip_number: row.sip_number || '',
      phone: row.phone || '',
      user_id: row.user_id ? String(row.user_id) : '',
      photoFile: null,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!editingId) return;
    if (!form.name.trim()) {
      toast.error('Nama dokter wajib diisi');
      return;
    }
    const fd = appendDoctorFormData(form);
    try {
      await sendDoctorForm('put', `/api/v1/doctors/${editingId}`, fd);
      toast.success('Dokter diperbarui');
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const confirmDeleteDoctor = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/v1/doctors/${deleteTarget.id}`);
      toast.success('Data dokter dihapus permanen dari basis data');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Data dokter dipakai di kunjungan, appointment, dan laporan. Hubungkan ke akun pengguna
        berperan dokter bila mereka perlu login. Penambahan dokter baru tidak melalui tombol di halaman
        ini. <strong>Hapus</strong> menghapus permanen dari basis data (gagal jika dokter masih dipakai
        di rekam medis atau appointment).
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar dokter</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 w-14 font-medium">Foto</th>
                    <th className="px-6 py-3 font-medium">Nama</th>
                    <th className="px-6 py-3 font-medium">Spesialis</th>
                    <th className="px-6 py-3 font-medium">SIP</th>
                    <th className="px-6 py-3 font-medium">Telepon</th>
                    <th className="px-6 py-3 font-medium">Akun</th>
                    <th className="px-6 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-t border-border/40">
                      <td className="px-6 py-3">
                        <UserAvatar user={row} className="h-10 w-10" />
                      </td>
                      <td className="px-6 py-3 font-medium">{row.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.specialist || '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.sip_number || '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.phone || '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {row.user_id
                          ? dokterUsers.find(
                              (u) => Number(u.id) === Number(row.user_id)
                            )?.email || `user #${row.user_id}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            title="Hapus permanen dari basis data"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <p className="px-6 py-12 text-center text-muted-foreground">Belum ada dokter.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit dokter</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Drg. …"
              />
            </div>
            <div className="space-y-2">
              <Label>Spesialis</Label>
              <Input
                value={form.specialist}
                onChange={(e) => setForm((f) => ({ ...f, specialist: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor SIP</Label>
              <Input
                value={form.sip_number}
                onChange={(e) => setForm((f) => ({ ...f, sip_number: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label>Akun login (dokter)</Label>
              <Select
                value={form.user_id || '__none__'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, user_id: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanpa akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tanpa akun</SelectItem>
                  {dokterUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Satu akun hanya boleh terhubung ke satu baris dokter.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Foto (ganti opsional)</Label>
              {editingId &&
                !form.photoFile &&
                (() => {
                  const cur = list.find((r) => r.id === editingId)?.photo;
                  return cur ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={{ ...list.find((r) => r.id === editingId), photo: cur }} className="h-16 w-16 rounded-lg" />
                      <span className="text-xs text-muted-foreground">Foto saat ini</span>
                    </div>
                  ) : null;
                })()}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) =>
                  setForm((f) => ({ ...f, photoFile: e.target.files?.[0] || null }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus dokter permanen?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  Data <strong>{deleteTarget.name}</strong> akan dihapus dari basis data. Ini gagal
                  jika dokter masih dipakai di rekam medis, appointment, atau kunjungan —
                  hapus/pindahkan data tersebut dulu.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDoctor}>
              Hapus permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
