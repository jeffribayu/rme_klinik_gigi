import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  nik: z.string().max(32).optional().or(z.literal('')),
  name: z.string().min(2, 'Nama wajib diisi'),
  gender: z.enum(['L', 'P']),
  birth_date: z.string().min(1, 'Tanggal lahir wajib'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  blood_type: z.string().max(8).optional().or(z.literal('')),
});

const inputClass =
  'h-11 rounded border-slate-300 bg-white text-[15px] shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-950';

const selectClass =
  'h-11 rounded border-slate-300 bg-white text-[15px] shadow-none focus:ring-1 focus:ring-teal-500 focus:ring-offset-0 dark:border-slate-700 dark:bg-slate-950';

function RequiredMark() {
  return <span className="ml-1 text-xs font-bold text-red-600">[wajib]</span>;
}

function Field({ label, required, error, className = '', children }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
        {label}
        {required && <RequiredMark />}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function PatientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [patientCode, setPatientCode] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nik: '',
      name: '',
      gender: 'L',
      birth_date: '',
      phone: '',
      address: '',
      blood_type: 'Tidak',
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/v1/patients/${id}`);
        const p = data.data;
        setPatientCode(p.patient_code || '');
        setValue('nik', p.nik || '');
        setValue('name', p.name);
        setValue('gender', p.gender);
        setValue('birth_date', p.birth_date?.slice(0, 10) || '');
        setValue('phone', p.phone || '');
        setValue('address', p.address || '');
        setValue('blood_type', p.blood_type || 'Tidak');
      } catch {
        toast.error('Gagal memuat pasien');
        navigate('/patients');
      }
    })();
  }, [id, isEdit, navigate, setValue]);

  const gender = watch('gender');
  const bloodType = watch('blood_type');

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      nik: values.nik || null,
      phone: values.phone || null,
      address: values.address || null,
      blood_type: values.blood_type || null,
    };
    try {
      if (isEdit) {
        await api.put(`/api/v1/patients/${id}`, payload);
        toast.success('Pasien diperbarui');
      } else {
        await api.post('/api/v1/patients', payload);
        toast.success('Pasien ditambahkan');
      }
      navigate('/patients');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="rounded border-slate-200 bg-white shadow-md shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5 sm:p-7">
          <div className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
            <h1 className="text-2xl font-medium uppercase tracking-normal text-slate-900 dark:text-slate-50 sm:text-3xl">
              {isEdit ? 'EDIT DATA PASIEN' : 'INPUT DATA PASIEN'}
            </h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="No Rekam Medis" required>
              <Input
                value={patientCode || (isEdit ? '' : 'Otomatis')}
                disabled
                className={`${inputClass} bg-slate-100 text-slate-600 disabled:opacity-100 dark:bg-slate-900`}
              />
            </Field>

            <Field label="Agama">
              <Select defaultValue="none">
                <SelectTrigger className={selectClass}>
                  <SelectValue placeholder="Silahkan Pilih" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Silahkan Pilih</SelectItem>
                  <SelectItem value="islam">Islam</SelectItem>
                  <SelectItem value="kristen">Kristen</SelectItem>
                  <SelectItem value="katolik">Katolik</SelectItem>
                  <SelectItem value="hindu">Hindu</SelectItem>
                  <SelectItem value="buddha">Buddha</SelectItem>
                  <SelectItem value="konghucu">Konghucu</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Identitas" required>
              <Select defaultValue="wni">
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wni">WNI</SelectItem>
                  <SelectItem value="wna">WNA</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Suku">
              <Input placeholder="Suku" className={inputClass} />
            </Field>

            <Field label="NIK" error={errors.nik?.message}>
              <Input id="nik" placeholder="NIK" className={inputClass} {...register('nik')} />
            </Field>

            <Field label="Bahasa yang Dikuasai">
              <Input placeholder="Bahasa yang Dikuasai" className={inputClass} />
            </Field>

            <Field label="Nama Pasien" required error={errors.name?.message}>
              <Input
                id="name"
                placeholder="Nama Pasien"
                className={inputClass}
                {...register('name')}
              />
            </Field>

            <Field label="Nomor Telepon Rumah">
              <Input placeholder="Nomor Telepon Rumah / Tempat Tinggal" className={inputClass} />
            </Field>

            <Field label="Jenis Kelamin" required>
              <Select value={gender} onValueChange={(v) => setValue('gender', v)}>
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">LAKI LAKI</SelectItem>
                  <SelectItem value="P">PEREMPUAN</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="No Hp (WhatsApp)" required>
              <Input id="phone" placeholder="No Hp" className={inputClass} {...register('phone')} />
            </Field>

            <Field label="Golongan Darah">
              <Select value={bloodType || 'Tidak'} onValueChange={(v) => setValue('blood_type', v)}>
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tidak">Informasi Tidak Tersedia</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="AB">AB</SelectItem>
                  <SelectItem value="O">O</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Email">
              <Input placeholder="Email" type="email" className={inputClass} />
            </Field>

            <Field label="Rhesus">
              <Select defaultValue="unknown">
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Informasi Tidak Tersedia</SelectItem>
                  <SelectItem value="positive">Positif</SelectItem>
                  <SelectItem value="negative">Negatif</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Pekerjaan">
              <Select defaultValue="none">
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Silahkan Pilih</SelectItem>
                  <SelectItem value="pelajar">Pelajar / Mahasiswa</SelectItem>
                  <SelectItem value="pegawai">Pegawai</SelectItem>
                  <SelectItem value="wiraswasta">Wiraswasta</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tempat Lahir" required>
              <Input placeholder="Tempat Lahir" className={inputClass} />
            </Field>

            <Field label="Pendidikan">
              <Select defaultValue="none">
                <SelectTrigger className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Silahkan Pilih</SelectItem>
                  <SelectItem value="sd">SD</SelectItem>
                  <SelectItem value="smp">SMP</SelectItem>
                  <SelectItem value="sma">SMA / SMK</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                  <SelectItem value="sarjana">Sarjana</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tanggal Lahir" required error={errors.birth_date?.message}>
              <Input
                id="birth_date"
                type="date"
                className={inputClass}
                {...register('birth_date')}
              />
            </Field>

            <Field label="Alamat" className="md:col-span-2">
              <Textarea
                id="address"
                placeholder="Alamat"
                className="min-h-28 rounded border-slate-300 bg-white text-[15px] shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-950"
                {...register('address')}
              />
            </Field>

            <div className="flex flex-col gap-2 pt-3 sm:flex-row md:col-span-2">
              <Button type="submit" disabled={isSubmitting} className="bg-teal-500 hover:bg-teal-600">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
