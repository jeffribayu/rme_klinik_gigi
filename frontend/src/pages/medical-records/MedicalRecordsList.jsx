import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FilePlus, Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

function assistantNames(treatment) {
  const names = String(treatment || '')
    .split('\n')
    .map((line) => line.match(/(?:petugas|asisten|perawat)\s+([^,]+)/i)?.[1]?.trim())
    .filter(Boolean)
    .filter((name) => name !== '-');
  return [...new Set(names)].join(', ') || '-';
}

export default function MedicalRecordsList() {
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = role === 'admin' || role === 'doctor';
  const canEdit = role === 'admin';
  const canDelete = role === 'admin';
  const [list, setList] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/medical-records');
      setList(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredList = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((mr) =>
      [mr.patient_name, mr.patient_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [list, patientSearch]);

  const deleteRecord = async (id) => {
    if (!window.confirm('Hapus rekam medis ini?')) return;
    try {
      await api.delete(`/api/v1/medical-records/${id}`);
      toast.success('Rekam medis dihapus');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus rekam medis');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rekam medis</h1>
          <p className="text-muted-foreground">Kunjungan, diagnosa, dan tindakan.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/medical-records/new">
              <FilePlus className="mr-2 h-4 w-4" />
              Kunjungan baru
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Daftar rekam medis</CardTitle>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Cari nama / kode pasien"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium w-16">ID</th>
                    <th className="px-6 py-3 font-medium">Tanggal</th>
                    <th className="px-6 py-3 font-medium">Pasien</th>
                    <th className="px-6 py-3 font-medium">Dokter</th>
                    <th className="px-6 py-3 font-medium">Asisten/Perawat</th>
                    <th className="px-6 py-3 font-medium">Diagnosis</th>
                    <th className="px-6 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((mr, idx) => (
                    <motion.tr
                      key={mr.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-t border-border/40 hover:bg-muted/30"
                    >
                      <td className="px-6 py-3 font-mono text-muted-foreground tabular-nums">
                        {mr.id}
                      </td>
                      <td className="px-6 py-3">{formatDate(mr.visit_date)}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{mr.patient_name}</div>
                        <div className="text-xs text-muted-foreground">{mr.patient_code}</div>
                      </td>
                      <td className="px-6 py-3">{mr.doctor_name}</td>
                      <td className="px-6 py-3">{assistantNames(mr.treatment)}</td>
                      <td className="px-6 py-3">
                        <span className="line-clamp-2">{mr.diagnosis || '—'}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-500 hover:text-white hover:ring-sky-500 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900"
                            asChild
                          >
                            <Link to={`/medical-records/${mr.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {(canEdit || canDelete) && (
                            <>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-500 hover:text-white hover:ring-amber-500 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900"
                                  asChild
                                >
                                  <Link to={`/medical-records/${mr.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-500 hover:text-white hover:ring-rose-500 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900"
                                  onClick={() => deleteRecord(mr.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredList.length === 0 && (
                <p className="px-6 py-12 text-center text-muted-foreground">
                  {list.length === 0 ? 'Belum ada rekam medis.' : 'Pasien tidak ditemukan.'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
