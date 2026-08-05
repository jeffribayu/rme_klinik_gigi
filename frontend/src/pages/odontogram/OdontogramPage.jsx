import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OdontogramInteractive from '@/components/odontogram/OdontogramInteractive';
import { useAuthStore } from '@/store/authStore';

export default function OdontogramPage() {
  const [params] = useSearchParams();
  const mrId = params.get('mr');
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'admin' || role === 'doctor';

  const [mr, setMr] = useState(null);

  useEffect(() => {
    if (!mrId) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/medical-records/${mrId}`);
        setMr(data.data);
      } catch {
        toast.error('Rekam medis tidak ditemukan');
      }
    })();
  }, [mrId]);

  if (!mrId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pilih rekam medis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tambahkan parameter{' '}
          <code className="rounded bg-muted px-1">?mr=&lt;id_rekam_medis&gt;</code> di URL, atau buka
          dari halaman detail rekam medis.
        </CardContent>
      </Card>
    );
  }

  if (!mr) {
    return <p className="text-muted-foreground">Memuat odontogram…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link to={`/medical-records/${mr.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke rekam medis
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Odontogram</h1>
          <p className="text-muted-foreground">
            {mr.patient_name} · Kunjungan {mr.visit_date?.slice(0, 10)}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/medical-records/${mr.id}/laporan-odontogram`}>
            <Printer className="mr-2 h-4 w-4" />
            Laporan odontogram
          </Link>
        </Button>
      </div>

      <OdontogramInteractive
        medicalRecordId={mr.id}
        odontograms={mr.odontograms || []}
        readOnly={!canEdit}
        detailHref={`/medical-records/${mr.id}`}
        onAfterSave={async () => {
          const { data } = await api.get(`/api/v1/medical-records/${mr.id}`);
          setMr(data.data);
        }}
      />
    </div>
  );
}
