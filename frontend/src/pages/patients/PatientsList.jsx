import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  Banknote,
  Bell,
  CalendarPlus,
  ClipboardCheck,
  Download,
  Eye,
  FileBarChart,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ageFromBirthDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

function formatBirthDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function whatsappUrl(phone, name) {
  if (!phone) return '';
  const normalized = String(phone).replace(/[^\d]/g, '').replace(/^0/, '62');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(
    `Halo ${name || 'Bapak/Ibu'}, kami dari klinik gigi ingin menghubungi Anda.`
  )}`;
}

export default function PatientsList() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'doctor' || role === 'nurse';

  const [list, setList] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [columnFilters, setColumnFilters] = useState({
    code: '',
    name: '',
    nik: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: pageSize,
        search,
      });
      if (gender) params.set('gender', gender);
      const { data } = await api.get(`/api/v1/patients?${params}`);
      setList(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 300);
    return () => clearTimeout(t);
  }, [search, gender, pageSize]);

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const filteredList = list.filter((p) => {
    const checks = [
      [columnFilters.code, p.patient_code],
      [columnFilters.name, p.name],
      [columnFilters.nik, p.nik],
      [columnFilters.phone, p.phone],
      [columnFilters.address, p.address],
    ];

    return checks.every(([filter, value]) =>
      String(value || '')
        .toLowerCase()
        .includes(filter.trim().toLowerCase())
    );
  });

  const setColumnFilter = (key, value) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const exportData = () => {
    const rows = filteredList.map((p) => [
      p.patient_code,
      p.name,
      p.gender,
      p.nik,
      p.phone,
      formatBirthDate(p.birth_date),
      p.address,
    ]);
    const csv = [
      ['No. RM', 'Nama', 'Gender', 'NIK', 'No. HP', 'Tanggal Lahir', 'Alamat'],
      ...rows,
    ]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data-pasien.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/v1/patients/${deleteId}`);
      toast.success('Pasien dihapus');
      setDeleteId(null);
      fetchData(meta.page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border/70 pb-3">
        <h1 className="text-2xl font-semibold uppercase tracking-normal text-slate-900 dark:text-slate-50 sm:text-3xl">
          Data Pasien
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {canWrite && (
            <Button asChild className="h-9 rounded-md bg-blue-600 px-3 shadow-none hover:bg-blue-700">
              <Link to="/patients/new">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Data
              </Link>
            </Button>
          )}
          <Button
            type="button"
            className="h-9 rounded-md bg-emerald-500 px-3 shadow-none hover:bg-emerald-600"
            onClick={() => toast.info('Template general consent belum tersedia.')}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            General Consent
          </Button>
          <Button asChild className="h-9 rounded-md bg-emerald-500 px-3 shadow-none hover:bg-emerald-600">
            <Link to="/payments">
              <Banknote className="mr-2 h-4 w-4" />
              Pembayaran
            </Link>
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md bg-amber-400 px-3 text-amber-950 shadow-none hover:bg-amber-500"
            onClick={() => toast.info('Reminder pasien bisa dikirim dari tombol pesan di setiap baris.')}
          >
            <Bell className="mr-2 h-4 w-4" />
            Reminder
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md bg-cyan-600 px-3 shadow-none hover:bg-cyan-700"
            onClick={() => toast.info('Gunakan menu laporan untuk laporan reminder.')}
          >
            <FileBarChart className="mr-2 h-4 w-4" />
            Laporan Reminder
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md bg-emerald-600 px-3 shadow-none hover:bg-emerald-700"
            onClick={exportData}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-md border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>Show</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-9 w-[76px] rounded-md bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>entries</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                className="h-9 w-full rounded-md bg-white sm:w-64 dark:bg-slate-950"
                placeholder="Cari semua data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={gender || 'all'} onValueChange={(v) => setGender(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9 w-full rounded-md bg-white sm:w-[150px] dark:bg-slate-950">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua gender</SelectItem>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="text-left text-slate-700 dark:text-slate-200">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="w-[120px] px-3 py-3 font-medium"></th>
                    <th className="w-[96px] px-2 py-3 font-medium">
                      <Input
                        className="h-10 rounded-md bg-white dark:bg-slate-950"
                        placeholder="No. RM"
                        value={columnFilters.code}
                        onChange={(e) => setColumnFilter('code', e.target.value)}
                      />
                    </th>
                    <th className="min-w-[170px] px-2 py-3 font-medium">
                      <Input
                        className="h-10 rounded-md bg-white dark:bg-slate-950"
                        placeholder="Nama..."
                        value={columnFilters.name}
                        onChange={(e) => setColumnFilter('name', e.target.value)}
                      />
                    </th>
                    <th className="w-[110px] px-2 py-3 font-medium"></th>
                    <th className="min-w-[210px] px-2 py-3 font-medium">
                      <Input
                        className="h-10 rounded-md bg-white dark:bg-slate-950"
                        placeholder="NIK..."
                        value={columnFilters.nik}
                        onChange={(e) => setColumnFilter('nik', e.target.value)}
                      />
                    </th>
                    <th className="min-w-[170px] px-2 py-3 font-medium">
                      <Input
                        className="h-10 rounded-md bg-white dark:bg-slate-950"
                        placeholder="No HP"
                        value={columnFilters.phone}
                        onChange={(e) => setColumnFilter('phone', e.target.value)}
                      />
                    </th>
                    <th className="w-[140px] px-2 py-3 font-medium"></th>
                    <th className="min-w-[220px] px-2 py-3 font-medium">
                      <Input
                        className="h-10 rounded-md bg-white dark:bg-slate-950"
                        placeholder="Alamat..."
                        value={columnFilters.address}
                        onChange={(e) => setColumnFilter('address', e.target.value)}
                      />
                    </th>
                  </tr>
                  <tr>
                    {[
                      'Action',
                      'No. RM',
                      'Nama',
                      'Gender',
                      'NIK',
                      'No. HP',
                      'Tanggal Lahir',
                      'Alamat',
                    ].map((label) => (
                      <th
                        key={label}
                        className="border-b border-slate-200 px-3 py-3 font-semibold dark:border-slate-800"
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((p, idx) => {
                    const age = ageFromBirthDate(p.birth_date);
                    const waUrl = whatsappUrl(p.phone, p.name);

                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="align-top hover:bg-slate-50 dark:hover:bg-slate-900/60"
                      >
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-800">
                          <div className="flex w-24 flex-wrap gap-2">
                            <Button asChild size="icon" className="h-8 w-8 rounded-md bg-none bg-[#64748B] text-white shadow-none hover:bg-none hover:bg-[#526174]">
                              <Link to={`/patients/${p.id}`} aria-label={`Lihat ${p.name}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {canWrite && (
                              <Button asChild size="icon" className="h-8 w-8 rounded-md bg-none bg-[#F59E0B] text-white shadow-none hover:bg-none hover:bg-[#D97706]">
                                <Link to={`/patients/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            <Button asChild className="h-14 w-[90px] flex-col gap-1 rounded-md bg-none bg-[#2563EB] px-2 py-2 text-xs text-white shadow-none hover:bg-none hover:bg-[#1D4ED8]">
                              <Link to={`/appointments?patient_id=${p.id}`}>
                                <CalendarPlus className="h-4 w-4" />
                                Jadwalkan
                              </Link>
                            </Button>
                            <Button asChild className="h-14 w-[90px] flex-col gap-1 rounded-md bg-none bg-[#1D4ED8] px-2 py-2 text-xs text-white shadow-none hover:bg-none hover:bg-[#1E40AF]">
                              <Link to={`/patients/${p.id}`}>
                                <Eye className="h-4 w-4" />
                                Riwayat
                              </Link>
                            </Button>
                            {waUrl ? (
                              <Button asChild className="h-14 w-[90px] flex-col gap-1 rounded-md bg-none bg-[#10B981] px-2 py-2 text-xs text-white shadow-none hover:bg-none hover:bg-[#059669]">
                                <a href={waUrl} target="_blank" rel="noreferrer">
                                  <MessageCircle className="h-4 w-4" />
                                  Kirim Pesan
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                className="h-14 w-[90px] flex-col gap-1 rounded-md bg-none bg-[#10B981] px-2 py-2 text-xs text-white shadow-none hover:bg-none hover:bg-[#059669]"
                                onClick={() => toast.info('Nomor HP pasien belum tersedia.')}
                              >
                                <MessageCircle className="h-4 w-4" />
                                Kirim Pesan
                              </Button>
                            )}
                            {canWrite && (
                              <Button
                                type="button"
                                size="icon"
                                className="h-8 w-8 rounded-md bg-none bg-[#EF4444] text-white shadow-none hover:bg-none hover:bg-[#DC2626]"
                                onClick={() => setDeleteId(p.id)}
                                aria-label={`Hapus ${p.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-200 px-3 py-4 font-mono text-sm dark:border-slate-800">
                          {p.patient_code}
                        </td>
                        <td className="border border-slate-200 px-3 py-4 font-medium dark:border-slate-800">
                          {p.name}
                        </td>
                        <td className="border border-slate-200 px-3 py-4 dark:border-slate-800">
                          <Badge variant="secondary">{p.gender === 'L' ? 'L' : 'P'}</Badge>
                        </td>
                        <td className="border border-slate-200 px-3 py-4 dark:border-slate-800">
                          {p.nik || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-4 dark:border-slate-800">
                          {p.phone || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-4 dark:border-slate-800">
                          <div>{formatBirthDate(p.birth_date)}</div>
                          {age != null && (
                            <Badge className="mt-2 rounded-full bg-slate-500 px-2 py-0.5 text-xs text-white hover:bg-slate-500">
                              {age} thn
                            </Badge>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-4 dark:border-slate-800">
                          {p.address || '-'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredList.length === 0 && (
                <p className="px-6 py-12 text-center text-muted-foreground">
                  Tidak ada data pasien.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredList.length} dari {meta.total} pasien - Halaman {meta.page} / {totalPages}
            </p>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => fetchData(meta.page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= totalPages}
                onClick={() => fetchData(meta.page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus pasien?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Rekam medis terkait juga akan terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
