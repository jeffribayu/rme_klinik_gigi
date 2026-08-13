import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/lib/dashboardPaths';

const emptyEdit = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'nurse',
  is_active: true,
};

export default function UsersSettings() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyEdit);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/users');
      setList(data.data || []);
    } catch {
      toast.error('Gagal memuat pengguna');
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
      email: row.email || '',
      phone: row.phone || '',
      password: '',
      confirmPassword: '',
      role: row.role || 'nurse',
      is_active: Number(row.is_active) === 1,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyEdit);
    setDialogOpen(true);
  };

  const submitUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nama dan email wajib');
      return;
    }
    if (!editingId && form.password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    if (!editingId && form.password !== form.confirmPassword) {
      toast.error('Konfirmasi password tidak sama');
      return;
    }
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        is_active: form.is_active,
      };
      if (editingId) {
        await api.put(`/api/v1/users/${editingId}`, body);
        toast.success('Pengguna diperbarui');
      } else {
        await api.post('/api/v1/users', {
          ...body,
          phone: form.phone?.trim() || '',
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: form.role,
        });
        toast.success(form.role === 'nurse' ? 'Perawat ditambahkan' : 'Dokter ditambahkan');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/v1/users/${deleteTarget.id}`);
      toast.success('Pengguna dihapus permanen dari basis data');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
    }
  };

  const toggleActive = async (row) => {
    try {
      await api.put(`/api/v1/users/${row.id}`, {
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        is_active: Number(row.is_active) !== 1,
      });
      toast.success(Number(row.is_active) === 1 ? 'Akun dinonaktifkan' : 'Akun diaktifkan');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengubah status akun');
    }
  };

  const openResetPassword = (row) => {
    setResetTarget(row);
    setPasswordForm({ password: '', confirmPassword: '' });
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  };

  const submitResetPassword = async () => {
    if (!resetTarget) return;
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('Konfirmasi password tidak sama');
      return;
    }
    try {
      await api.patch(`/api/v1/users/${resetTarget.id}/password`, passwordForm);
      toast.success('Password pengguna direset');
      setResetTarget(null);
      setPasswordForm({ password: '', confirmPassword: '' });
      setShowResetPassword(false);
      setShowResetConfirmPassword(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Data Pengguna: kelola akun <strong>dokter</strong> dan <strong>perawat</strong>. Akun admin tidak
          ditampilkan di sini.
        </p>
        <Button type="button" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/30">
          <CardTitle className="text-lg">Data Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium lg:px-6">Nama</th>
                    <th className="px-4 py-3 font-medium lg:px-6">Email</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell lg:px-6">
                      Telepon
                    </th>
                    <th className="px-4 py-3 font-medium lg:px-6">Role</th>
                    <th className="px-4 py-3 font-medium lg:px-6">Status</th>
                    <th className="px-4 py-3 text-right font-medium lg:px-6">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/40 transition-colors hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium lg:px-6">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground lg:px-6">{row.email}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell lg:px-6">
                        {row.phone || '—'}
                      </td>
                      <td className="px-4 py-3 lg:px-6">
                        <Badge variant="secondary" className="capitalize">
                          {ROLE_LABELS[row.role] || row.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 lg:px-6">
                        {Number(row.is_active) === 1 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="font-normal">
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right lg:px-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={Number(row.is_active) === 1 ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                            onClick={() => toggleActive(row)}
                          >
                            <Power className="mr-1 h-3.5 w-3.5" />
                            {Number(row.is_active) === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openResetPassword(row)}>
                            <KeyRound className="mr-1 h-3.5 w-3.5" />
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={row.id === currentUserId}
                            title="Hapus permanen dari basis data"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <p className="px-6 py-12 text-center text-muted-foreground">
                  Belum ada pengguna dokter/perawat.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Peran tidak dapat diubah di sini. Ubah status aktif jika akun tidak boleh login.'
                : 'Tambahkan akun dokter atau perawat yang bisa dipakai di data tindakan.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!editingId && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurse">Perawat</SelectItem>
                    <SelectItem value="doctor">Dokter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nomor HP</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            {!editingId && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password Awal</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Konfirmasi password</Label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.is_active ? '1' : '0'}
                onValueChange={(v) => setForm((f) => ({ ...f, is_active: v === '1' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aktif</SelectItem>
                  <SelectItem value="0">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitUser}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetTarget && (
                <>
                  Buat password baru untuk <strong>{resetTarget.email}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <div className="relative">
                <Input
                  type={showResetPassword ? 'text' : 'password'}
                  className="pr-10"
                  value={passwordForm.password}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setShowResetPassword((v) => !v)}
                  aria-label={
                    showResetPassword ? 'Sembunyikan password baru' : 'Tampilkan password baru'
                  }
                >
                  {showResetPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi Password Baru</Label>
              <div className="relative">
                <Input
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  className="pr-10"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setShowResetConfirmPassword((v) => !v)}
                  aria-label={
                    showResetConfirmPassword
                      ? 'Sembunyikan konfirmasi password baru'
                      : 'Tampilkan konfirmasi password baru'
                  }
                >
                  {showResetConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Batal
            </Button>
            <Button onClick={submitResetPassword}>Simpan Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pengguna permanen?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  Akun <strong>{deleteTarget.email}</strong> akan dihapus dari basis data dan tidak
                  dapat dikembalikan. Baris dokter yang menaut ke akun ini akan dilepas tautannya.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>
              Hapus permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
