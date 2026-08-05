import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, FileText } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'doctor' || role === 'nurse';
  const canCreateMedicalRecord = role === 'admin' || role === 'doctor';
  const canViewMedicalRecords = role === 'admin' || role === 'doctor';

  useEffect(() => {
    (async () => {
      try {
        const [p, r] = await Promise.all([
          api.get(`/api/v1/patients/${id}`),
          canViewMedicalRecords
            ? api.get(`/api/v1/medical-records?patient_id=${id}`)
            : Promise.resolve({ data: { data: [] } }),
        ]);
        setPatient(p.data.data);
        setRecords(r.data.data);
      } catch {
        toast.error('Gagal memuat data');
      }
    })();
  }, [canViewMedicalRecords, id]);

  if (!patient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{patient.name}</h1>
            <Badge>{patient.patient_code}</Badge>
          </div>
          <p className="text-muted-foreground">Detail demografi & riwayat kunjungan.</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline" asChild>
              <Link to={`/patients/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canCreateMedicalRecord && (
            <Button asChild>
              <Link to={`/medical-records/new?patient_id=${id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Kunjungan baru
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identitas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="NIK" value={patient.nik || '-'} />
            <Row label="Gender" value={patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'} />
            <Row label="Tanggal lahir" value={formatDate(patient.birth_date)} />
            <Row label="Telepon" value={patient.phone || '-'} />
            <Row label="Golongan darah" value={patient.blood_type || '-'} />
            <Row label="Alamat" value={patient.address || '-'} />
          </CardContent>
        </Card>

        {canViewMedicalRecords && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat rekam medis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {records.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada kunjungan.</p>
            )}
            {records.map((mr) => (
              <Link
                key={mr.id}
                to={`/medical-records/${mr.id}`}
                className="block rounded-lg border border-border/50 bg-muted/20 px-4 py-3 transition hover:bg-muted/40"
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{formatDate(mr.visit_date)}</span>
                  <span className="text-muted-foreground">{mr.doctor_name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {mr.diagnosis || '—'}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/30 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
