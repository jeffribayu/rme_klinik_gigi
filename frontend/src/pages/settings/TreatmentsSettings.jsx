import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';

const emptyForm = () => ({
  name: '',
  icd_code: '',
  icd9_code: '',
  tooth_element: '',
  price: 0,
  is_active: true,
});

export default function TreatmentsSettings() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/api/v1/treatments');
      setList(data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat master tindakan');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      [item.name, item.icd_code, item.icd9_code, item.tooth_element]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [list, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      icd_code: row.icd_code || '',
      icd9_code: row.icd9_code || '',
      tooth_element: row.tooth_element || '',
      price: Number(row.price) || 0,
      is_active: !!row.is_active,
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        price: Math.max(0, Number(form.price) || 0),
      };
      if (editing) {
        await api.put(`/api/v1/treatments/${editing.id}`, body);
        toast.success('Tindakan diperbarui');
      } else {
        await api.post('/api/v1/treatments', body);
        toast.success('Tindakan ditambahkan');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan tindakan');
    }
  };

  const deleteTreatment = async (row) => {
    if (!window.confirm(`Hapus tindakan "${row.name}"?`)) return;
    try {
      await api.delete(`/api/v1/treatments/${row.id}`);
      toast.success('Tindakan dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tindakan');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Master tindakan</h2>
          <p className="text-sm text-muted-foreground">
            Daftar tindakan dan tarif yang dipakai dokter saat pemeriksaan.
          </p>
        </div>
        <Button type="button" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Tindakan baru
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar tindakan</CardTitle>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tindakan / ICD / elemen gigi"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? 'Belum ada tindakan.' : 'Tindakan tidak ditemukan.'}
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {filteredList.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-muted-foreground">
                      {[item.icd_code, item.icd9_code, item.tooth_element].filter(Boolean).join(' - ') || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formatCurrency(item.price)}</Badge>
                    {item.is_active ? <Badge>Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => deleteTreatment(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit tindakan' : 'Tindakan baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-3">
            <div className="space-y-2">
              <Label>Nama tindakan *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ICD-X</Label>
                <Input value={form.icd_code} onChange={(e) => setForm((f) => ({ ...f, icd_code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ICD-IX CM</Label>
                <Input value={form.icd9_code} onChange={(e) => setForm((f) => ({ ...f, icd9_code: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Elemen gigi default</Label>
                <Input value={form.tooth_element} onChange={(e) => setForm((f) => ({ ...f, tooth_element: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tarif</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Aktif
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
