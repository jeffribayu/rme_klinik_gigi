import { useEffect, useState } from 'react';
import { Package, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';

const emptyForm = () => ({
  name: '',
  form: '',
  strength: '',
  notes: '',
  stock_qty: 0,
  is_active: true,
});

export default function MedicinesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'admin';
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [stockOpen, setStockOpen] = useState(false);
  const [stockRow, setStockRow] = useState(null);
  const [stockDelta, setStockDelta] = useState('');

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const { data } = await api.get(`/api/v1/medicines?${params}`);
      setList(data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat master obat');
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      form: row.form || '',
      strength: row.strength || '',
      notes: row.notes || '',
      stock_qty: Number(row.stock_qty) || 0,
      is_active: !!row.is_active,
    });
    setOpen(true);
  };

  const openStockAdjust = (row) => {
    setStockRow(row);
    setStockDelta('');
    setStockOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = {
        name: form.name.trim(),
        form: form.form || null,
        strength: form.strength || null,
        notes: form.notes || null,
        stock_qty: Math.max(0, Math.floor(Number(form.stock_qty)) || 0),
        is_active: form.is_active,
      };
      if (editing) {
        await api.put(`/api/v1/medicines/${editing.id}`, body);
        toast.success('Obat diperbarui');
      } else {
        await api.post('/api/v1/medicines', body);
        toast.success('Obat ditambahkan');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const saveStockDelta = async (e) => {
    e.preventDefault();
    if (!stockRow) return;
    const n = Math.trunc(Number(stockDelta));
    if (!Number.isFinite(n) || n === 0) {
      toast.error('Isi jumlah tambah/kurang (bukan 0), misal +50 atau -10');
      return;
    }
    try {
      await api.patch(`/api/v1/medicines/${stockRow.id}/stock`, { delta: n });
      toast.success('Stok diperbarui');
      setStockOpen(false);
      setStockRow(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah stok');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Obat &amp; resep</h1>
          <p className="text-muted-foreground">
            Master obat beserta stok. Admin mengelola daftar dan stok; dokter memakai daftar di
            resep.
          </p>
        </div>
        {isAdmin && (
          <Button type="button" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Obat baru
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cari</CardTitle>
        </CardHeader>
        <CardContent className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Nama, dosis, bentuk…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar obat</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada data.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {list.map((m) => {
                const st = Number(m.stock_qty) || 0;
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-muted-foreground">
                        {[m.strength, m.form].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={st === 0 ? 'destructive' : 'outline'}>Stok: {st}</Badge>
                      {m.is_active ? (
                        <Badge variant="secondary">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                      {isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openStockAdjust(m)}
                            title="Tambah atau kurangi stok"
                          >
                            <Package className="mr-1 h-3.5 w-3.5" />
                            Stok ±
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit obat' : 'Obat baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-3">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bentuk</Label>
                <Input
                  value={form.form}
                  onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}
                  placeholder="Tablet, kapsul…"
                />
              </div>
              <div className="space-y-2">
                <Label>Kekuatan / konsentrasi</Label>
                <Input
                  value={form.strength}
                  onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))}
                  placeholder="500 mg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jumlah stok (unit)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.stock_qty}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    stock_qty: v === '' ? 0 : Math.max(0, Math.floor(Number(v)) || 0),
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Total stok tersimpan. Untuk menambah/mengurangi cepat tanpa mengganti total, gunakan
                tombol &quot;Stok ±&quot; pada baris.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Aktif (tampil di pilihan resep)
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah stok — {stockRow?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveStockDelta} className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Stok sekarang: <strong>{Number(stockRow?.stock_qty) || 0}</strong> unit. Isi angka
              positif untuk menambah (mis. 30), negatif untuk mengurangi (mis. -5). Stok tidak akan
              di bawah nol.
            </p>
            <div className="space-y-2">
              <Label>Tambah / kurangi (unit)</Label>
              <Input
                type="number"
                step={1}
                value={stockDelta}
                onChange={(e) => setStockDelta(e.target.value)}
                placeholder="Contoh: 50 atau -10"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStockOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Terapkan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
